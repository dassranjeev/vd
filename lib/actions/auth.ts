"use server";

import { redirect } from "next/navigation";

import { getSession, login, logout } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";

import { attempt, fail, readString, type ActionState } from "./types";

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = readString(form, "email");
  const password = String(form.get("password") ?? "");
  const next = readString(form, "next");

  const state = await attempt(async () => {
    if (!email || !password) {
      return fail("Enter both your email and password.");
    }

    const result = await login(email, password);
    if (!result.ok) return fail(result.error);

    await recordActivity(await getSession(), {
      action: "login",
      entity: "session",
      summary: `${email} signed in`,
    });
    return { ok: true };
  });

  if (!state.ok) return state;

  // Only follow same-origin paths, never an attacker-supplied absolute URL.
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  const session = await getSession();
  await recordActivity(session, {
    action: "logout",
    entity: "session",
    summary: `${session?.email ?? "unknown"} signed out`,
  });
  await logout();
  redirect("/admin/login");
}
