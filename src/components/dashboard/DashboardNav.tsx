"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COPY } from "@/config/copy";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/types/domain";

type NavItem = { href: string; label: string; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/dashboard", label: COPY.dashboard.nav.overview, exact: true },
  { href: "/dashboard/oglasi", label: COPY.dashboard.nav.listings },
  { href: "/dashboard/prihod", label: COPY.dashboard.nav.revenue },
  { href: "/dashboard/upiti", label: COPY.dashboard.nav.inquiries },
  { href: "/dashboard/podesavanja", label: COPY.dashboard.nav.settings },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/admin/korisnici", label: COPY.dashboard.nav.users },
  { href: "/dashboard/admin/kategorije", label: COPY.dashboard.nav.categories },
];

export function DashboardNav({
  role,
  unreadInquiries = 0,
}: {
  role: UserRole;
  unreadInquiries?: number;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm transition-colors",
      active
        ? "bg-panel-2 text-fg shadow-[inset_2px_0_0_var(--color-signal)]"
        : "text-fg-muted hover:bg-panel-2 hover:text-fg",
    );

  return (
    <nav aria-label={COPY.dashboard.title} className="space-y-6">
      <ul className="space-y-0.5">
        {NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href, item.exact) ? "page" : undefined}
              className={linkClass(isActive(item.href, item.exact))}
            >
              {item.label}
              {item.href === "/dashboard/upiti" && unreadInquiries > 0 ? (
                <span className="u-numeric bg-signal text-on-signal rounded-xs px-1.5 py-0.5 text-[0.6875rem] font-semibold">
                  {unreadInquiries}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      {role === "admin" ? (
        <div>
          <p className="u-eyebrow text-fg-faint mb-2 px-3">{COPY.dashboard.nav.adminSection}</p>
          <ul className="space-y-0.5">
            {ADMIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={linkClass(isActive(item.href))}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
