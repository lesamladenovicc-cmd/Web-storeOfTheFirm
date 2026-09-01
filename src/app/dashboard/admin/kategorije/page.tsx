import { COPY } from "@/config/copy";
import { PageHeader } from "@/components/layout/Container";
import { EmptyState } from "@/components/ui/Feedback";
import { requireAdmin } from "@/lib/auth";
import { getCategoriesForAdmin } from "@/lib/data/categories";
import { CategoryManager } from "./CategoryManager";

export const dynamic = "force-dynamic";

/**
 * Categories are data, not code: an admin can re-niche the store here
 * without a redeploy. The taxonomy stays FLAT — there is no parent_id
 * column and no UI to create one.
 */
export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await getCategoriesForAdmin();

  return (
    <>
      <PageHeader
        eyebrow={COPY.dashboard.nav.adminSection}
        title={COPY.dashboard.categories.title}
      />

      <div className="mt-8">
        {categories.length === 0 ? (
          <EmptyState title={COPY.dashboard.categories.empty} />
        ) : (
          <CategoryManager categories={categories} />
        )}
      </div>
    </>
  );
}
