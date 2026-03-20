import Image from "next/image";
import Link from "next/link";

type ProductCardProps = {
  title: string;
  summary: string;
  material: string;
  tags: string[];
  image: string;
  detailHref: string;
  detailLabel: string;
  inquiryHref: string;
  inquiryLabel: string;
};

export function ProductCard({
  title,
  summary,
  material,
  tags,
  image,
  detailHref,
  detailLabel,
  inquiryHref,
  inquiryLabel,
}: ProductCardProps) {
  return (
    <article className="noor-panel overflow-hidden rounded-[1.5rem] border border-border/80">
      <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,_rgba(173,132,86,0.18),_rgba(25,31,22,0.04))]">
        <Image src={image} alt={title} fill className="object-cover" />
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-accent-deep">
            {material}
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-foreground">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-muted">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/70 bg-white/55 px-3 py-1 text-xs text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={detailHref}
            className="inline-flex rounded-full border border-accent/35 px-4 py-2.5 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
          >
            {detailLabel}
          </Link>
          <Link
            href={inquiryHref}
            className="inline-flex rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-deep"
          >
            {inquiryLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
