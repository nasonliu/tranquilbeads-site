import Image from "next/image";
import Link from "next/link";

type CollectionCardProps = {
  name: string;
  description: string;
  image: string;
  href: string;
  ctaLabel: string;
};

export function CollectionCard({
  name,
  description,
  image,
  href,
  ctaLabel,
}: CollectionCardProps) {
  return (
    <article className="noor-panel noor-card-glow grid overflow-hidden rounded-[1.75rem] border border-border/80 md:grid-cols-[0.8fr_1fr]">
      <div className="relative min-h-64 overflow-hidden bg-[linear-gradient(135deg,_rgba(173,132,86,0.18),_rgba(107,122,81,0.12))]">
        <Image src={image} alt={name} fill className="object-cover" />
      </div>
      <div className="flex flex-col justify-between gap-6 p-6">
        <div>
          <h3 className="noor-title text-3xl">{name}</h3>
          <p className="mt-4 text-sm leading-7 text-muted">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex w-fit rounded-full border border-accent/40 px-5 py-3 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
