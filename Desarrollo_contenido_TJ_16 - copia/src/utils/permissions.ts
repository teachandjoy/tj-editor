import type { UserRole, UserPermissions, PermissionModule, PermissionAction, User } from '../types';

// All modules and their valid actions
export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: 'Dashboard',
  temas: 'Temas',
  ofertas: 'Ofertas',
  usuarios: 'Usuarios',
  multimedia: 'Multimedia',
  referencias: 'Referencias',
  identidades: 'Identidades Corp.',
  configuracion: 'Configuracion',
};

export const MODULE_ACTIONS: Record<PermissionModule, PermissionAction[]> = {
  dashboard: ['ver'],
  temas: ['ver', 'crear', 'editar', 'eliminar', 'publicar'],
  ofertas: ['ver', 'crear', 'editar', 'eliminar'],
  usuarios: ['ver', 'crear', 'editar', 'eliminar'],
  multimedia: ['ver', 'crear', 'eliminar'], // 'crear' = subir
  referencias: ['ver', 'crear', 'editar', 'eliminar'],
  identidades: ['ver', 'crear', 'editar', 'eliminar'],
  configuracion: ['ver', 'editar'],
};

export const ACTION_LABELS: Record<PermissionAction, string> = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  publicar: 'Publicar',
};

export const ALL_MODULES: PermissionModule[] = [
  'dashboard', 'temas', 'ofertas', 'usuarios',
  'multimedia', 'referencias', 'identidades', 'configuracion',
];

export const ALL_ACTIONS: PermissionAction[] = ['ver', 'crear', 'editar', 'eliminar', 'publicar'];

// ---- Default permissions per role ----

function makePerms(overrides: Partial<UserPermissions>): UserPermissions {
  const base: UserPermissions = {
    dashboard: {},
    temas: {},
    ofertas: {},
    usuarios: {},
    multimedia: {},
    referencias: {},
    identidades: {},
    configuracion: {},
  };
  for (const mod of ALL_MODULES) {
    if (overrides[mod]) {
      base[mod] = { ...overrides[mod] };
    }
  }
  return base;
}

const allTrue = (actions: PermissionAction[]): Record<string, boolean> => {
  const r: Record<string, boolean> = {};
  actions.forEach(a => { r[a] = true; });
  return r;
};

export function getDefaultPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'admin':
      return makePerms({
        dashboard: allTrue(['ver']),
        temas: allTrue(['ver', 'crear', 'editar', 'eliminar', 'publicar']),
        ofertas: allTrue(['ver', 'crear', 'editar', 'eliminar']),
        usuarios: allTrue(['ver', 'crear', 'editar', 'eliminar']),
        multimedia: allTrue(['ver', 'crear', 'eliminar']),
        referencias: allTrue(['ver', 'crear', 'editar', 'eliminar']),
        identidades: allTrue(['ver', 'crear', 'editar', 'eliminar']),
        configuracion: allTrue(['ver', 'editar']),
      });

    case 'coordinador':
      return makePerms({
        dashboard: allTrue(['ver']),
        temas: allTrue(['ver', 'crear', 'editar', 'publicar']),
        ofertas: allTrue(['ver', 'crear', 'editar']),
        usuarios: allTrue(['ver', 'crear', 'editar']),
        multimedia: allTrue(['ver', 'crear']),
        referencias: allTrue(['ver', 'crear', 'editar']),
        identidades: allTrue(['ver', 'crear', 'editar']),
        configuracion: { ver: true },
      });

    case 'editor':
      return makePerms({
        dashboard: allTrue(['ver']),
        temas: { ver: true, editar: true },
        multimedia: { ver: true },
        referencias: { ver: true },
      });

    default:
      return makePerms({});
  }
}

// ---- Permission checking helpers ----

/** Resolve effective permissions for a user: custom if set, else role defaults. */
export function getEffectivePermissions(user: User): UserPermissions {
  // Check if permissions object has any actual module keys with actions
  const perms = user.permissions;
  if (perms && Object.keys(perms).some(k => {
    const mod = perms[k as PermissionModule];
    return mod && Object.keys(mod).length > 0;
  })) {
    return perms;
  }
  return getDefaultPermissions(user.role);
}

/** Check if user has a specific permission. */
export function hasPermission(user: User, module: PermissionModule, action: PermissionAction): boolean {
  const perms = getEffectivePermissions(user);
  return !!perms[module]?.[action];
}

/** Check if user can see a module (has 'ver' permission). */
export function canView(user: User, module: PermissionModule): boolean {
  return hasPermission(user, module, 'ver');
}

// ---- Route-to-module mapping ----

export const ROUTE_MODULE_MAP: Record<string, PermissionModule> = {
  '/dashboard': 'dashboard',
  '/topics': 'temas',
  '/academic': 'ofertas',
  '/repository': 'multimedia',
  '/bibliography': 'referencias',
  '/editorial': 'temas',
  '/templates': 'temas',
  '/export': 'temas',
  '/users': 'usuarios',
  '/identities': 'identidades',
  '/settings': 'configuracion',
};

/** Given a pathname, return the required module or null if no guard needed. */
export function getRequiredModule(pathname: string): PermissionModule | null {
  // Check exact match first
  if (ROUTE_MODULE_MAP[pathname]) return ROUTE_MODULE_MAP[pathname];
  // Check prefix match (e.g., /editor/xxx maps to temas)
  if (pathname.startsWith('/editor/') || pathname.startsWith('/preview/')) return 'temas';
  return null;
}
