import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StateMessageProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  /** A button or link that gets the person unstuck. */
  action?: ReactNode;
  /** "empty" invites to act; "error" says what broke and how to fix it. */
  tone?: "empty" | "error";
}

/** Message for an empty section or an error, always with a way forward. */
export function StateMessage({
  icon: Icon,
  title,
  children,
  action,
  tone = "empty",
}: StateMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-start gap-4 rounded-2xl border px-6 py-7 sm:flex-row",
        tone === "empty"
          ? "border-dashed border-line bg-surface/60"
          : "border-danger/35 bg-danger/[0.07]",
      )}
    >
      <Icon
        aria-hidden
        className={cn("size-6 shrink-0", tone === "empty" ? "text-lilac" : "text-danger")}
      />
      <div className="flex-1">
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-1 max-w-[60ch] text-ink-muted">{children}</div>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
