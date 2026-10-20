export function isAdminRouteActive(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}
