// users-interfaces.ts

export type RoleCode = 'ADMIN_GENERAL' | 'GASTOS_EDITOR'; // extiende cuando agregues más

export interface FiltersUsers {
  page: number;
  limit: number;
  name?: string; 
  email?: string;
}

export interface UsersUiFilters {
  name: string;
  email: string;
  page: number;
  limit: number;
}

export interface UserResponseDto {
  id: number;
  name: string;
  lastName: string;
  email: string;
  isActive: boolean;
  roles: RoleCode[];
}

export interface CreateUserDto {
  name: string;
  lastName: string;
  email: string;
  password: string;
  isActive?: boolean;
  roles?: RoleCode[];
}

export interface UpdateUserDto {
  name?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
}

export interface UpdateUserRolesDto {
  roles: RoleCode[];
}

export interface UpdateUserPasswordDto {
  password: string;
}

// ====== CREATE / UPDATE payloads para el modal (unificados) ======
export interface CreateUserPayload {
  name: string;
  lastName: string;
  email: string;
  password: string;
  roleCodes: RoleCode[];
  isActive: boolean;
}

export interface UpdateUserPayload {
  name: string;
  lastName: string;
  email: string;
  roleCodes: RoleCode[];
  isActive: boolean;

  // opcional si luego permites cambiar password en el mismo PATCH:
  password?: string | null;
}
