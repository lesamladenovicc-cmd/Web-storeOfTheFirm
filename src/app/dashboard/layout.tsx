import type { Metadata } from "next";
import { COPY } from "@/config/copy";
import { Container } from "@/components/layout/Container";
import { Logo } from "@/components/layout/Logo";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { requireProfile } from "@/lib/auth";
import { getUnreadInquiryCount } from "@/lib/data/inquiries";
import { logoutAction } from "@/app/prijava/actions";

/**
 * Layer 2 of 3. proxy.ts already bounced anonymous requests; this layer
 * loads the profile, enforces the deactivation and temporary-password
 * rules, and hands the role to the nav.
 *
 * RLS remains the actual boundary — a forged cookie gets past both of
 * these and still cannot read another seller's rows.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: COPY.dashboard.title,
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const unread = await getUnreadInquiryCount();

  return (
    <div className="min-h-dvh">
      <header className="border-line bg-panel border-b">
        <Container className="flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Logo />
            <span className="u-eyebrow text-fg-faint hidden sm:inline">{COPY.dashboard.title}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-fg-muted hidden text-sm sm:inline">
              {profile.fullName || profile.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="border-line-strong text-fg-muted hover:border-danger hover:text-danger h-9 rounded-sm border px-3.5 text-sm transition-colors"
              >
                {COPY.nav.logout}
              </button>
            </form>
          </div>
        </Container>
      </header>

      <Container className="grid gap-10 py-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <DashboardNav role={profile.role} unreadInquiries={unread} />
        </aside>
        <main id="sadrzaj" className="min-w-0">
          {children}
        </main>
      </Container>
    </div>
  );
}
