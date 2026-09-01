import { COPY } from "@/config/copy";
import { ROLE_LABELS } from "@/config/taxonomy";
import { PageHeader } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { requireAdmin } from "@/lib/auth";
import { getProfiles } from "@/lib/data/profiles";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CreateUserForm } from "./CreateUserForm";
import { UserRowActions } from "./UserRowActions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await getProfiles();

  return (
    <>
      <PageHeader
        eyebrow={COPY.dashboard.nav.adminSection}
        title={COPY.dashboard.users.title}
      />

      <div className="mt-8">
        <CreateUserForm />
      </div>

      <div className="mt-8">
        {users.length === 0 ? (
          <EmptyState title={COPY.dashboard.users.empty} />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left">
                  <Th>{COPY.dashboard.users.colName}</Th>
                  <Th>{COPY.dashboard.users.colEmail}</Th>
                  <Th>{COPY.dashboard.users.colRole}</Th>
                  <Th>{COPY.dashboard.users.colStatus}</Th>
                  <Th>{COPY.dashboard.users.colCreated}</Th>
                  <Th className="text-right">{COPY.dashboard.listings.colActions}</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <Td className="font-medium text-paper">
                      {user.fullName || "—"}
                      {user.id === admin.id ? (
                        <span className="ml-2 text-xs text-paper-faint">(vi)</span>
                      ) : null}
                    </Td>
                    <Td className="u-numeric text-paper-muted">{user.email}</Td>
                    <Td>
                      <Badge tone={user.role === "admin" ? "accent" : "neutral"}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={user.isActive ? "success" : "danger"}>
                        {user.isActive
                          ? COPY.dashboard.users.active
                          : COPY.dashboard.users.inactive}
                      </Badge>
                    </Td>
                    <Td className="u-numeric text-paper-muted">
                      {formatDate(user.createdAt)}
                    </Td>
                    <Td>
                      <UserRowActions user={user} isSelf={user.id === admin.id} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("u-eyebrow px-4 py-3 text-paper-faint", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
