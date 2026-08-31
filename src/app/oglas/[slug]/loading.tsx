import { Container } from "@/components/layout/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-8 sm:py-12">
          <Skeleton className="mb-7 h-4 w-64" />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
            <div>
              <Skeleton className="aspect-4/3 rounded-md" />
              <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-sm" />
                ))}
              </div>
              <Skeleton className="mt-8 h-5 w-24" />
              <Skeleton className="mt-4 h-10 w-3/4" />
              <Skeleton className="mt-5 h-9 w-52" />
              <Skeleton className="mt-7 h-20 w-full" />
              <Skeleton className="mt-9 h-40 w-full" />
            </div>
            <Skeleton className="h-[30rem] rounded-md" />
          </div>
        </Container>
      </main>
    </>
  );
}
