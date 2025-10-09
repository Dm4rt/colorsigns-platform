'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const IMAGES = ['/shop_0.jpeg', '/shop_1.jpeg', '/shop_2.jpeg', '/shop_3.jpeg', '/shop_4.jpeg'];

type Props = {
  className?: string;
  autoPlayMs?: number;          // set to 0 to disable autoplay
  fullBleed?: boolean;          // new: makes the wrapper edge-to-edge
  heightClass?: string;         // optional: override height (e.g., "h-[60vh]")
};

export default function HeroCarousel({
  className = '',
  autoPlayMs = 4000,
  fullBleed = false,
  heightClass = 'h-[320px] md:h-[420px]',
}: Props) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const count = IMAGES.length;

  const go = (n: number) => setIdx((i) => (i + n + count) % count);
  const goTo = (n: number) => setIdx(((n % count) + count) % count);

  const pause = () => { if (timer.current) clearInterval(timer.current); };
  const resume = () => {
    if (autoPlayMs > 0) {
      pause();
      timer.current = setInterval(() => go(1), autoPlayMs);
    }
  };

  useEffect(() => { resume(); return pause; }, [autoPlayMs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Wrapper style: full-bleed vs card
  const wrapperBase = 'relative w-full overflow-hidden';
  const cardExtras = 'max-w-5xl mx-auto rounded-2xl shadow-lg';
  const wrapperClass = `${wrapperBase} ${fullBleed ? '' : cardExtras} ${className}`;

  return (
    <section
      className={wrapperClass}
      onMouseEnter={pause}
      onMouseLeave={resume}
      aria-roledescription="carousel"
    >
      {/* Fixed rectangle area */}
      <div className={`relative ${heightClass} bg-black/10`}>
        {IMAGES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-500 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={i !== idx}
          >
            <Image src={src} alt={`Shop image ${i + 1}`} fill className="object-cover" priority={i === 0} />
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      {/* Arrows */}
      <button
        aria-label="Previous image"
        onClick={() => go(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 backdrop-blur-sm"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        aria-label="Next image"
        onClick={() => go(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 backdrop-blur-sm"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {IMAGES.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to image ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-2.5 w-2.5 rounded-full transition ${i === idx ? 'bg-white' : 'bg-white/50 hover:bg-white/80'}`}
          />
        ))}
      </div>
    </section>
  );
}
