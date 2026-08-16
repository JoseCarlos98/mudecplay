export type RoleCode = 'ADMIN_GENERAL' | 'GASTOS_EDITOR' | string;

export interface MenuItems {
  name: string;
  icon?: string;
  route?: string;          // ruta final
  children?: MenuItems[];  // submenú
  roles?: RoleCode[];
}
