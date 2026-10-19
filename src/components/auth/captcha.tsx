"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Turnstile = { render: (element: HTMLElement, options: object) => string; remove: (id: string) => void };
export function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const api = (window as unknown as { turnstile?: Turnstile }).turnstile;
    if (!ready || !siteKey || !container.current || !api) return;
    const id = api.render(container.current, { sitekey: siteKey, callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => onToken("") });
    return () => api.remove(id);
  }, [ready, siteKey, onToken]);
  if (!siteKey) return null;
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} /><div ref={container} className="max-w-full overflow-hidden" /></>;
}
