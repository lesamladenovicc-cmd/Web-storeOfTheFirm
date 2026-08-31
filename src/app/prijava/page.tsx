import type { Metadata } from "next";
import Link from "next/link";
import { COPY } from "@/config/copy";
import { SITE } from "@/config/site";
import { Logo } from "@/components/layout/Logo";
import { Alert } from "@/components/ui/Feedback";
import { safeRedirectPath } from "@/lib/validation/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: COPY.auth.loginTitle,
  // The login page must never be indexed or followed.
  robots: { index: false, follow: false, nocache: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; greska?: string }>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next);

  return (
    <main className="u-grain relative grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-md border border-border bg-surface p-7">
          <h1 className="text-h2 text-paper">{COPY.auth.loginTitle}</h1>
          <p className="mt-2 mb-7 text-sm text-paper-muted">{COPY.auth.loginSubtitle}</p>

          {params.greska === "deaktiviran" ? (
            <div className="mb-5">
              <Alert tone="danger">{COPY.auth.inactiveAccount}</Alert>
            </div>
          ) : null}

          <LoginForm next={next} />
        </div>

        {/* There is no public sign-up route, by design. */}
        <p className="mt-6 text-center text-sm leading-relaxed text-paper-faint">
          {COPY.auth.noSignupNote}
        </p>

        <p className="mt-8 text-center">
          <Link href="/" className="text-sm text-paper-muted transition-colors hover:text-accent">
            &larr; {SITE.name}
          </Link>
        </p>
      </div>
    </main>
  );
}
