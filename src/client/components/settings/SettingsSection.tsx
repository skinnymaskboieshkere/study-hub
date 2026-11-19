import type { ReactNode } from "react";

/** A card of the settings page. */
export function SettingsSection({
  id,
  title,
  hint,
  children,
}: {
  id?: string;
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-1 max-w-[65ch] text-sm text-ink-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
