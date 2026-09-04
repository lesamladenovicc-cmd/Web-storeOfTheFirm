import Link from "next/link";
import { COPY } from "@/config/copy";
import { ROLE_LABELS } from "@/config/taxonomy";
import { PageHeader } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { requireProfile } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await requireProfile();

  return (
    <>
      <PageHeader
        eyebrow={COPY.dashboard.title}
        title={COPY.dashboard.settings.title}
        actions={<Badge tone="neutral">{ROLE_LABELS[profile.role]}</Badge>}
      />

      <section className="mt-8">
        <h2 className="u-eyebrow text-fg-faint mb-5">{COPY.dashboard.settings.profileSection}</h2>
        <ProfileForm profile={profile} />
      </section>

      <section className="border-line mt-12 border-t pt-8">
        <h2 className="u-eyebrow text-fg-faint mb-3">{COPY.dashboard.settings.passwordSection}</h2>
        <p className="text-fg-muted mb-4 text-sm">{profile.email}</p>
        <Link
          href="/dashboard/promena-lozinke"
          className="border-line-strong text-fg hover:border-accent hover:text-accent-text inline-flex h-10 items-center rounded-sm border px-4 text-sm transition-colors"
        >
          {COPY.auth.changePasswordTitle}
        </Link>
      </section>
    </>
  );
}
