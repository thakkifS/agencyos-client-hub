import type { Metadata } from "next";
import { OverviewDashboard } from "@/components/client-hub/overview-dashboard";

export const metadata: Metadata = { title: "Overview | Agency OS Client Hub" };

export default function OverviewPage() {
  return <OverviewDashboard />;
}
