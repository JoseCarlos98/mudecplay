export interface AuthUser {
  id: number;
  email: string;
  name: string;
  lastName: string;
  roles: string[]; // <-- importante para UI por permisos
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}
