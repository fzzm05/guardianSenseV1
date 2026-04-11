import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const data = await loadParentDashboardData();
  const { child: initialChildId } = await searchParams;

  return (
    <ParentDashboard
      activeRoute="overview"
      children={data.children}
      parentEmail={data.parentEmail}
      parentId={data.parentId}
      parentDisplayName={data.parentDisplayName}
      recentEvents={data.recentEvents}
      safeZones={data.safeZones}
      isTelegramLinked={data.isTelegramLinked}
      initialSelectedChildId={initialChildId ?? null}
    />
  );
}
