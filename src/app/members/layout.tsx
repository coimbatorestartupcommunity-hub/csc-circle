import type { ReactNode } from "react";

/** The community directory has its own footer-free route layout. */
export default function MembersLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {children}
    </main>
  );
}
