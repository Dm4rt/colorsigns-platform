'use client';

import { useState, useEffect } from 'react';

export default function PageTransition({
  children,
  duration = 700,
}: {
  children: React.ReactNode;
  duration?: number;
}) {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Trigger the fade/blur removal only after the component mounts
    const timer = setTimeout(() => setFadeIn(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`transition-all ease-out ${
        fadeIn ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
      }`}
      style={{
        transitionDuration: `${duration}ms`,
        willChange: 'opacity, filter',
      }}
    >
      {children}
    </div>
  );
}
