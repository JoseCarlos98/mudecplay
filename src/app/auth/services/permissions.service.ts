import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { RoleCode } from '../interfaces/auth.interface';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private auth = inject(AuthService);

  private get roles(): RoleCode[] {
    return (this.auth.currentUser()?.roles ?? []) as RoleCode[];
  }

  isAdmin(): boolean {
    return this.roles.includes('ADMIN_GENERAL');
  }

  hasRole(role: RoleCode): boolean {
    // bypass admin
    return this.isAdmin() || this.roles.includes(role);
  }

  hasAnyRole(required: RoleCode[]): boolean {
    // bypass admin
    if (!required?.length) return true;
    if (this.isAdmin()) return true;
    return required.some(r => this.roles.includes(r));
  }
}
