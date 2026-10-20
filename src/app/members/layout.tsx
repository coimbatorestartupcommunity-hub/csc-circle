import type { ReactNode } from "react";

/** The community directory has its own footer-free route layout. */
export default function MembersLayout({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
