import type { ReactNode } from "react";

interface ShowcaseSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function ShowcaseSection({ id, title, description, children }: ShowcaseSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-6 border-t border-line py-12"
    >
      <h2 id={`${id}-title`} className="text-2xl font-semibold text-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-[60ch] text-ink-muted">{description}</p>
      <div className="mt-8 space-y-10">{children}</div>
    </section>
  );
}

/** A small group inside a section, with a plain heading. */
export function ShowcaseGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-medium text-ink-muted">{title}</h3>
      {children}
    </div>
  );
}
