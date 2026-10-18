import { cx, statusClasses } from "./classes";

export function formatAudienceLabel(item?: {
  targetType?: string | null;
  departmentId?: number | null;
  branchId?: number | null;
  sectionId?: number | null;
  hostelId?: number | null;
  userEmail?: string | null;
  role?: string | null;
  recipientType?: string | null;
  recipientTargets?: string | null;
  departmentName?: string | null;
  branchName?: string | null;
  sectionName?: string | null;
  hostelName?: string | null;
} | null): string {
  if (!item) return "Everyone";

  const targetType = (item.targetType || "").toUpperCase();
  const recipientType = (item.recipientType || "").toLowerCase();

  const parseTargetName = (raw?: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
          const val = parsed[0].trim();
          if (val && isNaN(Number(val))) return val;
        }
      } catch {
        // Not JSON
      }
    }
    if (!trimmed.startsWith("[") && !trimmed.startsWith("{") && isNaN(Number(trimmed))) {
      return trimmed;
    }
    return null;
  };

  const targetName = parseTargetName(item.recipientTargets);

  if (targetType === "GLOBAL" || recipientType === "all" || recipientType === "all_campus") {
    return "Everyone";
  }

  if (targetType === "DEPARTMENT") {
    const name = item.departmentName || targetName;
    return name ? `Department · ${name}` : "Department";
  }

  if (targetType === "BRANCH") {
    const name = item.branchName || targetName;
    return name ? `Branch · ${name}` : "Branch";
  }

  if (targetType === "SECTION") {
    const name = item.sectionName || targetName;
    return name ? `Section · ${name}` : "Section";
  }

  if (targetType === "HOSTEL") {
    const name = item.hostelName || targetName;
    return name ? `Hostel · ${name}` : "Hostel";
  }

  if (recipientType === "student_only") return "Students";
  if (recipientType === "faculty_only") return "Faculty";
  if (recipientType === "specific_hod") return "Department HODs";
  if (recipientType === "specific_dean") return "Deans";
  if (recipientType === "specific_faculty") return "Faculty";

  if (targetType === "ROLE") {
    const rawRole = item.role || targetName;
    if (rawRole) {
      const formatted = rawRole
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return `Role · ${formatted}`;
    }
    return "Role";
  }

  if (targetType === "USER") {
    const email = item.userEmail || targetName;
    return email ? `Direct · ${email}` : "Direct Channel";
  }

  return "Everyone";
}

export function AudienceBadge({
  audience,
  urgent = false,
  tone = "muted",
}: {
  audience: string;
  urgent?: boolean;
  tone?: "brand" | "violet" | "cyan" | "muted";
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-2/95 px-3 py-1 text-[10px] sm:text-xs font-extrabold tracking-wider uppercase text-muted transition-[transform,border-color] duration-200 ease-out group-hover:scale-105 group-hover:border-white/25">
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full transition-transform duration-300 group-hover:scale-125",
          urgent
            ? "bg-danger shadow-[0_0_8px_rgba(255,42,95,0.85)]"
            : tone === "violet"
            ? "bg-brand-2 shadow-[0_0_8px_rgba(147,51,234,0.85)]"
            : "bg-brand-light shadow-[0_0_8px_rgba(124,58,237,0.85)]"
        )}
      />
      {audience}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const isLive = status.toUpperCase() === "PUBLISHED" || status.toUpperCase() === "ANSWERED";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium tracking-wider uppercase backdrop-blur-md transition-all duration-200",
        statusClasses(status)
      )}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {isLive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {status}
    </span>
  );
}

export function UrgentBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/50 bg-gradient-to-r from-danger-soft via-[#3d131f] to-danger-soft px-3 py-1 text-[9px] font-extrabold tracking-[0.14em] text-[#ff8ba0] shadow-[0_0_16px_rgba(244,63,94,0.4)] backdrop-blur-md animate-pulse-glow">
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-80" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
      </span>
      URGENT SIGNAL
    </span>
  );
}

export function SoftBadge({
  children,
  tone = "brand",
}: {
  children: React.ReactNode;
  tone?: "brand" | "violet" | "cyan" | "amber" | "muted" | "success";
}) {
  const toneMap = {
    brand: "border border-brand/40 bg-brand-50/90 text-brand-light shadow-[0_0_12px_rgba(99,102,241,0.2)]",
    violet: "border border-brand-2/40 bg-brand-50/90 text-brand-2-light shadow-[0_0_12px_rgba(168,85,247,0.2)]",
    cyan: "border border-cyan/40 bg-teal-soft/90 text-cyan-light shadow-[0_0_12px_rgba(6,182,212,0.2)]",
    amber: "border border-amber/40 bg-warning-soft/90 text-amber-light shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    success: "border border-success/40 bg-success-soft/90 text-[#6ee7b7] shadow-[0_0_12px_rgba(16,185,129,0.2)]",
    muted: "border border-border/90 bg-surface-2/90 text-muted",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-medium tracking-wide uppercase backdrop-blur-md transition-all duration-200",
        toneMap[tone]
      )}
    >
      {children}
    </span>
  );
}


