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
        <h2 className="u-eyebrow mb-5 text-paper-faint">
          {COPY.dashboard.settings.profileSection}
        </h2>
        <ProfileForm profile={profile} />
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="u-eyebrow mb-3 text-paper-faint">
          {COPY.dashboard.settings.passwordSection}
        </h2>
        <p className="mb-4 text-sm text-paper-muted">{profile.email}</p>
        <Link
          href="/dashboard/promena-lozinke"
          className="inline-flex h-10 items-center rounded-sm border border-border-strong px-4 text-sm text-paper transition-colors hover:border-accent hover:text-accent"
        >
          {COPY.auth.changePasswordTitle}
        </Link>
      </section>
    </>
  );
}
