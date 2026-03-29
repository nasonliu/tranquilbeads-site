type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  showcase?: React.ReactNode;
  aside?: React.ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  showcase,
  aside,
}: PageHeroProps) {
  return (
    <section className="noor-container grid gap-8 pt-12 md:grid-cols-[1.3fr_0.7fr] md:pt-16">
      <div className="noor-panel noor-card-glow relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-8 lg:px-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
        <p className="noor-kicker mb-4 text-xs font-semibold text-accent-deep">
          {eyebrow}
        </p>
        <h1 className="noor-title max-w-3xl text-5xl leading-none text-foreground sm:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg">
          {description}
        </p>
        {actions ? <div className="mt-8 flex flex-wrap gap-4">{actions}</div> : null}
        {showcase}
      </div>
      {aside ? <div className="space-y-4">{aside}</div> : null}
    </section>
  );
}
