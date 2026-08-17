"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { createUserAction, deleteUserAction, updateUserAction } from "@/lib/actions/users";
import { idleState } from "@/lib/actions/types";

import { ConfirmSubmit, FormFeedback, SubmitButton } from "./form";
import { Badge, Card, CardHeader, Field, Input, Select } from "./ui";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLoginAt: Date | null;
};

function UserRowForm({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [state, action] = useActionState(updateUserAction, idleState);

  return (
    <li className="py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-white/90">{user.email}</span>
        <Badge tone={user.role === "admin" ? "info" : "neutral"}>{user.role}</Badge>
        {isSelf && <Badge tone="success">You</Badge>}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <form action={action} className="flex flex-1 flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={user.id} />

          <Field label="Name" className="min-w-[140px] flex-1">
            <Input name="name" defaultValue={user.name} maxLength={120} />
          </Field>

          <Field label="Role" className="w-32">
            <Select name="role" defaultValue={user.role}>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>

          <Field
            label="New password"
            className="min-w-[160px] flex-1"
            error={state.fieldErrors?.password}
            help="Leave blank to keep the current one."
          >
            <Input name="password" type="password" autoComplete="new-password" placeholder="••••••••••" />
          </Field>

          <SubmitButton size="sm" pendingLabel="Saving…">
            Save
          </SubmitButton>
        </form>

        {!isSelf && (
          <form action={deleteUserAction} className="pb-0.5">
            <input type="hidden" name="id" value={user.id} />
            <ConfirmSubmit
              message={`Remove ${user.email}'s access?`}
              title="Remove access"
              className="text-white/40 hover:text-red-300"
            >
              <Trash2 />
            </ConfirmSubmit>
          </form>
        )}
      </div>

      <FormFeedback state={state} className="mt-3" />
    </li>
  );
}

export function UsersManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [state, action] = useActionState(createUserAction, idleState);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Accounts"
          description="Editors can manage content. Admins can also manage the team and reset passwords."
        />
        <ul className="divide-y divide-white/[0.06]">
          {users.map((user) => (
            <UserRowForm key={user.id} user={user} isSelf={user.id === currentUserId} />
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Add someone" description="They sign in at /admin/login with these details." />
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="new-user-email" error={state.fieldErrors?.email}>
              <Input id="new-user-email" name="email" type="email" required placeholder="editor@studio.com" />
            </Field>
            <Field label="Name" htmlFor="new-user-name">
              <Input id="new-user-name" name="name" maxLength={120} />
            </Field>
            <Field
              label="Password"
              htmlFor="new-user-password"
              error={state.fieldErrors?.password}
              help="At least 10 characters."
            >
              <Input
                id="new-user-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Role" htmlFor="new-user-role">
              <Select id="new-user-role" name="role" defaultValue="editor">
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
          </div>

          <FormFeedback state={state} />

          <SubmitButton pendingLabel="Creating…">Create account</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
