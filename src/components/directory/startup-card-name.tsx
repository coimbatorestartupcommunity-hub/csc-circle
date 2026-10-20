"use client";

import * as React from "react";

export function StartupCardName({ name }: { name: string }) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const [fontSize, setFontSize] = React.useState(() => Math.max(8, Math.min(18, 18 * 25 / Math.max(1, name.length))));

  React.useEffect(() => {
    const heading = headingRef.current;
    const available = heading?.parentElement;
    if (!heading || !available) return;

    const fitName = () => {
      const width = available.clientWidth - 1;
      if (!width) return;
      const style = window.getComputedStyle(heading);
      const context = document.createElement("canvas").getContext("2d");
      if (!context) {
        // Keep the first client render safe in browsers without canvas text
        // measurement; ResizeObserver will retry if the card width changes.
        setFontSize(Math.max(8, Math.min(18, width / Math.max(name.length * 0.56, 1))));
        return;
      }
      const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
      const textWidthAt = (size: number) => {
        context.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
        return context.measureText(name).width + Math.max(0, name.length - 1) * letterSpacing;
      };

      // Binary-search the actual available width instead of estimating from
      // character count. This keeps long company names on one line after
      // responsive layout changes and after the Poppins font finishes loading.
      let low = 8;
      let high = 18;
      if (textWidthAt(low) > width) {
        setFontSize(low);
        return;
      }
      while (high - low > 0.2) {
        const middle = (low + high) / 2;
        if (textWidthAt(middle) <= width) low = middle;
        else high = middle;
      }
      setFontSize(Math.floor(low * 10) / 10);
    };

    fitName();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fitName);
    observer.observe(available);
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) fitName();
    });
    window.addEventListener("resize", fitName);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("resize", fitName);
    };
  }, [name]);

  return <h3 ref={headingRef} title={name} style={{ fontSize: `${fontSize}px` }} className="block min-w-0 max-w-full whitespace-nowrap leading-tight font-semibold text-brand-ink">{name}</h3>;
}
