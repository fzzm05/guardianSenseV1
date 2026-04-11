import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await loadParentDashboardData();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      {/* Header - Fixed height & high z-index for dropdowns */}
      <header className="relative z-50 shrink-0 border-b border-neutral-200/70 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-white/[0.06] dark:bg-neutral-900/80">
        <div className="mx-auto max-w-[1560px]">
          <DashboardHeader
            parentDisplayName={data.parentDisplayName}
            parentEmail={data.parentEmail}
          />
        </div>
      </header>

      {/* Content Area - Independent Scroll */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
