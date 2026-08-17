import { PasswordForm, ProfileForm } from "@/components/admin/AccountForms";
import { PageHeader } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <>
      <PageHeader title="My account" description="Your name and sign-in password." />

      <div className="space-y-6">
        <ProfileForm name={session.name} email={session.email} />
        <PasswordForm />
      </div>
    </>
  );
}
