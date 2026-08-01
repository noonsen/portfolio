import type { AdminIconName } from './admin-icon-names';

export type AdminRouteId = 'overview' | 'theme' | 'content' | 'images' | 'checks' | 'data';

export type AdminRouteActiveMatch = 'exact' | 'prefix';

export type AdminRouteIconName = Extract<
  AdminIconName,
  'astro-logo-color' | 'palette' | 'admin-page' | 'images' | 'shield-check' | 'database'
>;

export type AdminRouteDefinition = {
  id: AdminRouteId;
  href:
    | '/admin/'
    | '/admin/theme/'
    | '/admin/content/'
    | '/admin/images/'
    | '/admin/checks/'
    | '/admin/data/';
  label: string;
  sidebarLabel: string;
  sidebarIcon: AdminRouteIconName;
  description: string;
  activeMatch?: AdminRouteActiveMatch;
};

export const ADMIN_ROUTES: readonly AdminRouteDefinition[] = [
  {
    id: 'overview',
    href: '/admin/',
    label: 'Overview',
    sidebarLabel: 'Overview',
    sidebarIcon: 'astro-logo-color',
    description: 'Admin home page',
    activeMatch: 'exact'
  },
  {
    id: 'theme',
    href: '/admin/theme/',
    label: 'Theme',
    sidebarLabel: 'Theme',
    sidebarIcon: 'palette',
    description: 'Theme settings'
  },
  {
    id: 'content',
    href: '/admin/content/',
    label: 'Content',
    sidebarLabel: 'Writing',
    sidebarIcon: 'admin-page',
    description: 'Content management'
  },
  {
    id: 'images',
    href: '/admin/images/',
    label: 'Images',
    sidebarLabel: 'Images',
    sidebarIcon: 'images',
    description: 'Image management'
  },
  {
    id: 'checks',
    href: '/admin/checks/',
    label: 'Checks',
    sidebarLabel: 'Checks',
    sidebarIcon: 'shield-check',
    description: 'Site diagnostics'
  },
  {
    id: 'data',
    href: '/admin/data/',
    label: 'Data',
    sidebarLabel: 'Snapshot',
    sidebarIcon: 'database',
    description: 'Settings import/export'
  }
] as const;

export const isAdminRouteId = (value: string): value is AdminRouteId =>
  ADMIN_ROUTES.some((route) => route.id === value);

export const getAdminRoute = (id: AdminRouteId): AdminRouteDefinition =>
  ADMIN_ROUTES.find((route) => route.id === id) ?? ADMIN_ROUTES[0]!;

export const isAdminRoutePathActive = (
  pathname: string,
  href: string,
  match: AdminRouteActiveMatch = 'prefix'
): boolean =>
  match === 'exact'
    ? pathname === href
    : pathname === href || pathname.startsWith(href);

export const isAdminRouteRailPathActive = (pathname: string, href: string): boolean =>
  isAdminRoutePathActive(pathname, href, 'exact');
