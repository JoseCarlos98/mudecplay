export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export type RoleCode =
  | 'ADMIN_GENERAL'
  | 'GASTOS_EDITOR'
  | 'GASTOS_XML_IMPORTADOR'
  | 'REPORTES_EMISOR'
  | 'PROVEEDORES_EDITOR'
  | 'PROYECTOS_EDITOR'
  | 'CLIENTES_EDITOR'
  | 'RESPONSABLES_EDITOR'
  | 'PRODUCTOS_EDITOR'
  | 'USUARIOS_EDITOR'
  | (string & {});

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  lastName: string;
  roles: RoleCode[];
  isActive?: boolean;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}
