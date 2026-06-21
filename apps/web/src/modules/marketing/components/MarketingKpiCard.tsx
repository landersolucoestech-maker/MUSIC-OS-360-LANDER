/**
 * Marketing KPI card — thin wrapper over the shared MetricCard that adds an
 * optional navigation link, keeping dashboard tiles consistent and clickable.
 */

import { Link } from "react-router-dom";
import { MetricCard } from "@/shared/components/MetricCard";

interface MarketingKpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "success" | "warning" | "destructive";
  to?: string;
}

export function MarketingKpiCard({ to, ...props }: MarketingKpiCardProps) {
  const card = <MetricCard {...props} />;
  if (!to) return card;
  return (
    <Link to={to} className="block transition-transform">
      {card}
    </Link>
  );
}
