interface PagePlaceholderProps {
  title: string;
  /** What will appear on this page, in plain words. */
  description: string;
  /** Stage of SPEC §8 that builds this page. */
  stage: string;
}

/** Temporary page body until the real section is built. */
export function PagePlaceholder({ title, description, stage }: PagePlaceholderProps) {
  return (
    <section className="pt-8 sm:pt-12">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink-muted">{description}</p>
      <p className="mt-8 inline-flex rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink-muted">
        Появится на этапе {stage}
      </p>
    </section>
  );
}
