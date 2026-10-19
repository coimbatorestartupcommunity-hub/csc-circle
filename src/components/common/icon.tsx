import {
  Users,
  Presentation,
  GraduationCap,
  Cpu,
  UserPlus,
  MessagesSquare,
  TrendingUp,
  IdCard,
  CircleUser,
  CalendarCheck,
  Network,
  Handshake,
  Rocket,
  Sprout,
  type LucideIcon,
} from "lucide-react";

/** Registry mapping content icon names to lucide components (tree-shakeable). */
export const iconRegistry = {
  Users,
  Presentation,
  GraduationCap,
  Cpu,
  UserPlus,
  MessagesSquare,
  TrendingUp,
  IdCard,
  UserCircle: CircleUser,
  CalendarCheck,
  Network,
  Handshake,
  Rocket,
  Sprout,
} as const;

export type IconName = keyof typeof iconRegistry;

export function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const Cmp: LucideIcon = iconRegistry[name];
  return <Cmp className={className} aria-hidden="true" />;
}
