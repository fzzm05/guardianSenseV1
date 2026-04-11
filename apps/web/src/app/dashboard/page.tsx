import { Metadata } from "next";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const data = await loadParentDashboardData();
  const { child: initialChildId } = await searchParams;

  return (
    <ParentDashboard
      parentId={data.parentId}
      isTelegramLinked={data.isTelegramLinked}
      children={data.children}
      recentEvents={data.recentEvents}
      safeZones={data.safeZones}
      initialSelectedChildId={initialChildId ?? null}
    />
  );
}
