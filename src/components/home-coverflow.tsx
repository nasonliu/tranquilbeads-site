'use client';

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";

type CoverflowItem = {
  title: string;
  href: string;
  image: string;
  material: string;
  badge: string;
};

type HomeCoverflowProps = {
  items: CoverflowItem[];
  locale: "en" | "ar";
};

function wrapIndex(index: number, length: number) {
  if (length === 0) return 0;
  return (index + length) % length;
}

export function HomeCoverflow({ items, locale }: HomeCoverflowProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isArabic = locale === "ar";

  const shiftBy = useEffectEvent((direction: number) => {
    setActiveIndex((current) => wrapIndex(current + direction, items.length));
  });

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => shiftBy(1), 3600);
    return () => window.clearInterval(timer);
  }, [items.length, shiftBy]);

  if (items.length === 0) return null;

  const slotOffsets = [-2, -1, 0, 1, 2];

  return (
    <div className="mt-10 rounded-[1.75rem] border border-accent/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(244,236,223,0.92))] px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_40px_rgba(94,71,36,0.08)] sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent-deep/80">
            {isArabic ? "واجهة المنتجات" : "Product Showcase"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={isArabic ? "العنصر السابق في العرض" : "Previous showcase item"}
            onClick={() => shiftBy(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-white/70 text-lg text-accent-deep transition hover:bg-white"
          >
            {isArabic ? "→" : "←"}
          </button>
          <button
            type="button"
            aria-label={isArabic ? "العنصر التالي في العرض" : "Next showcase item"}
            onClick={() => shiftBy(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-white/70 text-lg text-accent-deep transition hover:bg-white"
          >
            {isArabic ? "←" : "→"}
          </button>
        </div>
      </div>

      <div className="relative mt-6 h-[240px] overflow-hidden sm:h-[290px]">
        <div className="absolute inset-x-2 bottom-4 h-14 rounded-full bg-[radial-gradient(circle,rgba(64,44,22,0.18),rgba(64,44,22,0))]" />
        {slotOffsets.map((offset) => {
          const item = items[wrapIndex(activeIndex + offset, items.length)];
          const distance = Math.abs(offset);
          const translateX = offset * 88;
          const translateY = distance === 0 ? 0 : distance * 8;
          const rotateY = 0;
          const scale = distance === 0 ? 1 : distance === 1 ? 0.94 : 0.88;
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.86 : 0.68;
          const zIndex = 30 - distance;
          const pointerEvents = "auto";

          return (
            <Link
              key={`${item.href}-${offset}`}
              href={item.href}
              aria-label={item.title}
              className="absolute left-1/2 top-0 flex w-[38%] min-w-[168px] max-w-[270px] -translate-x-1/2 flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-[#fbf7ef] shadow-[0_18px_36px_rgba(64,44,22,0.14)] transition-transform duration-500 ease-out sm:w-[22%] sm:max-w-[240px]"
              style={{
                transform: `translateX(${translateX}%) translateY(${translateY}px) scale(${scale}) rotateY(${rotateY}deg)`,
                opacity,
                zIndex,
                pointerEvents,
                transformStyle: "preserve-3d",
              }}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#f1e7d5]">
                <img
                  src={item.image}
                  alt={`${item.title} showcase`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent px-4 pb-4 pt-10">
                  <span className="inline-flex rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-deep">
                    {item.badge}
                  </span>
                </div>
              </div>
              <div className="space-y-2 px-4 py-4">
                <p className="line-clamp-2 text-base font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="line-clamp-1 text-xs uppercase tracking-[0.2em] text-muted">
                  {item.material}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
