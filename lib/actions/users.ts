"use server";

import { and, eq, ne, sql as raw } from "drizzle-orm";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { getSession, hashPassword, requireAdmin, requireSession, verifyPassword } from "@/lib/auth";
import { getDb, users } from "@/lib/db";

import { attempt, fail, readString, succeed, type ActionState } from "./types";

const emailSchema = z.string().email("Enter a valid email address.");
const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That password is too long.");

export async function createUserAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireAdmin();

    const email = readString(form, "email").toLowerCase();
    const name = readString(form, "name");
    const password = String(form.get("password") ?? "");
    const role = readString(form, "role") === "admin" ? "admin" : "editor";

    const emailCheck = emailSchema.safeParse(email);
    if (!emailCheck.success) return fail("Check the email address.", { email: emailCheck.error.issues[0].message });

    const passwordCheck = passwordSchema.safeParse(password);
    if (!passwordCheck.success) {
      return fail("Check the password.", { password: passwordCheck.error.issues[0].message });
    }

    const db = getDb();
    const [clash] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (clash) return fail("An account with that email already exists.", { email: "Already in use." });

    await db.insert(users).values({ email, name, role, passwordHash: await hashPassword(password) });
    await recordActivity(session, { action: "created", entity: "user", summary: email });
    return succeed(`Invited ${email}.`);
  });
}

export async function updateUserAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireAdmin();
    const id = readString(form, "id");
    if (!id) return fail("Missing user ID.");

    const name = readString(form, "name");
    const role = readString(form, "role") === "admin" ? "admin" : "editor";
    const password = String(form.get("password") ?? "");

    const db = getDb();

    // Never let the last admin demote themselves out of the panel.
    if (role !== "admin") {
      const [{ count }] = await db
        .select({ count: raw<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.active, true), ne(users.id, id)));
      if (count === 0) return fail("At least one active administrator must remain.");
    }

    const patch: Record<string, unknown> = { name, role, updatedAt: raw`now()` };

    if (password) {
      const passwordCheck = passwordSchema.safeParse(password);
      if (!passwordCheck.success) {
        return fail("Check the password.", { password: passwordCheck.error.issues[0].message });
      }
      patch.passwordHash = await hashPassword(password);
    }

    await db.update(users).set(patch).where(eq(users.id, id));
    await recordActivity(session, { action: "updated", entity: "user", entityId: id, summary: name });
    return succeed(password ? "Account and password updated." : "Account updated.");
  });
}

export async function deleteUserAction(form: FormData) {
  const session = await requireAdmin();
  const id = readString(form, "id");
  if (!id || id === session.sub) return; // Can't delete yourself.

  const db = getDb();
  const [{ count }] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true), ne(users.id, id)));
  if (count === 0) return;

  const [removed] = await db.delete(users).where(eq(users.id, id)).returning({ email: users.email });
  await recordActivity(session, {
    action: "deleted",
    entity: "user",
    entityId: id,
    summary: removed?.email ?? id,
  });
}

/** Any signed-in user changing their own password. */
export async function changeOwnPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const current = String(form.get("currentPassword") ?? "");
    const next = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (next !== confirm) {
      return fail("The new passwords don't match.", { confirmPassword: "Doesn't match." });
    }

    const check = passwordSchema.safeParse(next);
    if (!check.success) return fail("Check the new password.", { newPassword: check.error.issues[0].message });

    const db = getDb();
    const [record] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, session.sub))
      .limit(1);
    if (!record) return fail("Your account could not be found.");

    if (!(await verifyPassword(current, record.passwordHash))) {
      return fail("Your current password is incorrect.", { currentPassword: "Incorrect." });
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(next), updatedAt: raw`now()` })
      .where(eq(users.id, session.sub));

    await recordActivity(await getSession(), {
      action: "updated",
      entity: "user",
      entityId: session.sub,
      summary: "changed own password",
    });
    return succeed("Password changed.");
  });
}

/** Update your own display name. */
export async function updateOwnProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async () => {
    const session = await requireSession();
    const name = readString(form, "name");
    if (!name) return fail("Enter a name.", { name: "A name is required." });

    await getDb().update(users).set({ name, updatedAt: raw`now()` }).where(eq(users.id, session.sub));
    return succeed("Profile updated. Sign out and back in to refresh the header.");
  });
}
