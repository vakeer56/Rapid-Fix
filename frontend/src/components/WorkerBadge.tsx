import { ShieldAlert, ShieldCheck, BadgeCheck, Crown, Gem } from "lucide-react";

export interface Badge {
  tier: "pending" | "verified" | "verified_pro" | "trusted_pro" | "trusted_elite" | string;
  label: string;
}

interface WorkerBadgeProps {
  badge?: Badge | null;
  size?: "sm" | "md";
  className?: string;
}

const TIER_STYLES: Record<string, { icon: typeof ShieldCheck; classes: string }> = {
  pending: {
    icon: ShieldAlert,
    classes: "bg-slate-800 border-slate-700 text-slate-400",
  },
  verified: {
    icon: ShieldCheck,
    classes: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  },
  verified_pro: {
    icon: BadgeCheck,
    classes: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  },
  trusted_pro: {
    icon: Crown,
    classes: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  },
  trusted_elite: {
    icon: Gem,
    classes:
      "bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_12px_-2px_rgba(251,191,36,0.5)]",
  },
};

/**
 * Renders a worker's trust-badge tier as a styled chip.
 * The `badge` object is supplied by the backend (auto-derived Mongoose virtual).
 */
export default function WorkerBadge({ badge, size = "md", className = "" }: WorkerBadgeProps) {
  const tier = badge?.tier || "pending";
  const label = badge?.label || "Verification Pending";
  const style = TIER_STYLES[tier] || TIER_STYLES.pending;
  const Icon = style.icon;

  const sizing =
    size === "sm"
      ? "text-[9px] px-2 py-0.5 gap-1"
      : "text-[10px] px-3 py-1 gap-1.5";
  const iconSize = size === "sm" ? 11 : 13;

  return (
    <span
      className={`inline-flex items-center uppercase tracking-widest font-extrabold rounded-full border ${style.classes} ${sizing} ${className}`}
    >
      <Icon size={iconSize} />
      {label}
    </span>
  );
}
