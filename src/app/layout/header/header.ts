import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../auth/services/auth.service';
import { AuthUser, RoleCode } from '../../auth/interfaces/auth.interface';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Input() isMobile = false;
  @Input() sidebarOpen = false;

  @Output() toggleSidebar = new EventEmitter<void>();

  private readonly auth = inject(AuthService);

  currentUser: AuthUser | null = this.auth.currentUser();

  isUserMenuOpen = false;

  private readonly roleLabelMap: Record<string, string> = {
    ADMIN_GENERAL: 'Admin general',
    GASTOS_EDITOR: 'Gastos editor',
    GASTOS_XML_IMPORTADOR: 'Importador XML gastos',
    REPORTES_EMISOR: 'Reportes emisor',
    PROVEEDORES_EDITOR: 'Proveedores editor',
    PROYECTOS_EDITOR: 'Proyectos editor',
    CLIENTES_EDITOR: 'Clientes editor',
    RESPONSABLES_EDITOR: 'Responsables editor',
    PRODUCTOS_EDITOR: 'Productos editor',
    USUARIOS_EDITOR: 'Usuarios editor',
    CUENTAS_POR_COBRAR_EDITOR: 'Cuentas por cobrar editor',
    CUENTAS_POR_COBRAR_XML_IMPORTADOR: 'Importador XML CxC',
    AREAS_EDITOR: 'Áreas editor',
    AREAS_EMPLEADOS_EDITOR: 'Áreas empleados editor',
  };

  get userName(): string {
    const name = this.currentUser?.name ?? '';
    const lastName = this.currentUser?.lastName ?? '';

    return `${name} ${lastName}`.trim() || 'Usuario';
  }

  get userShortName(): string {
    const name = this.currentUser?.name?.trim();

    if (name) return name;

    return this.userName.split(' ')[0] || 'Usuario';
  }

  get userEmail(): string {
    return this.currentUser?.email || 'Sin correo registrado';
  }

  get userInitials(): string {
    const name = this.currentUser?.name?.trim() ?? '';
    const lastName = this.currentUser?.lastName?.trim() ?? '';

    const first = name.charAt(0);
    const second = lastName.charAt(0);

    const initials = `${first}${second}`.trim();

    if (initials) return initials.toUpperCase();

    return 'US';
  }

  get userRoleLabels(): string[] {
    return (this.currentUser?.roles ?? []).map((role) =>
      this.getRoleLabel(role),
    );
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  private getRoleLabel(role: RoleCode): string {
    const roleText = String(role);

    return this.roleLabelMap[roleText] ?? this.toTitleCase(roleText);
  }

  private toTitleCase(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}