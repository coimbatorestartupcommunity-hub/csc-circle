"use client";

import * as React from "react";

export function StartupCardName({ name }: { name: string }) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const [fontSize, setFontSize] = React.useState(() => Math.max(7, Math.min(18, 18 * 25 / Math.max(1, name.length))));

  React.useEffect(() => {
    const heading = headingRef.current;
    const available = heading?.parentElement;
    if (!heading || !available) return;

    const fitName = () => {
      const width = available.clientWidth;
      if (!width) return;
      const style = window.getComputedStyle(heading);
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      context.font = `${style.fontWeight} 18px ${style.fontFamily}`;
      const measuredWidth = context.measureText(name).width;
      if (measuredWidth > 0) setFontSize(Math.max(7, Math.min(18, 18 * width / measuredWidth)));
    };

    fitName();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fitName);
    observer.observe(available);
    return () => observer.disconnect();
  }, [name]);

  return <h3 ref={headingRef} title={name} style={{ fontSize: `${fontSize}px` }} className="min-w-0 whitespace-nowrap leading-tight font-semibold text-brand-ink">{name}</h3>;
}
