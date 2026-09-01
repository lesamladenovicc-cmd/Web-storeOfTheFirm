import { COPY } from "@/config/copy";
import { PageHeader } from "@/components/layout/Container";
import { requireProfile } from "@/lib/auth";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

/**
 * allowPasswordChange stops requireProfile from redirecting here
 * forever while must_change_password is still set.
 */
export default async function ChangePasswordPage() {
  const profile = await requireProfile({ allowPasswordChange: true });

  return (
    <>
      <PageHeader
        eyebrow={COPY.dashboard.settings.passwordSection}
        title={COPY.auth.changePasswordTitle}
        subtitle={
          profile.mustChangePassword ? COPY.auth.changePasswordSubtitle : undefined
        }
      />
      <div className="mt-8">
        <PasswordForm />
      </div>
    </>
  );
}
