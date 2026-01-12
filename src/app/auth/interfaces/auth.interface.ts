export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export type RoleCode =
  | 'ADMIN_GENERAL'
  | 'GASTOS_EDITOR'
  | 'REPORTES_EMISOR'
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
