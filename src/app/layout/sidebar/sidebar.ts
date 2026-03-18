import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MenuItems } from './models/siderbar-models';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatTooltipModule,
    MatButtonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatExpansionModule,
    MatSidenavModule,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly auth = inject(AuthService);

  readonly panelOpenState = signal(false);

  // Menú "source" con roles (NO renderizar directo)
  private readonly menuItemsSource: (MenuItems & { roles?: string[] })[] = [
    { name: 'Gastos', icon: 'attach_money', route: '/gastos', roles: ['GASTOS_EDITOR'] },
    // { name: 'Cuentas por Cobrar', icon: 'account_balance', route: '/cuentas-por-cobrar', roles: ['CUENTAS_POR_COBRAR_EDITOR'] },
    { name: 'Reportes', icon: 'bar_chart', route: '/reportes', roles: ['REPORTES_EMISOR'] },

    // OJO: "Catálogos" NO tiene roles propios; se mostrará si algún hijo es visible
    {
      name: 'Catálogos',
      icon: '',
      children: [
        { name: 'Proveedores', icon: 'store', route: '/proveedores', roles: ['PROVEEDORES_EDITOR'] },
        { name: 'Proyectos', icon: 'work', route: '/proyectos', roles: ['PROYECTOS_EDITOR'] },
        { name: 'Clientes', icon: 'groups', route: '/clientes', roles: ['CLIENTES_EDITOR'] },
        { name: 'Responsables', icon: 'person', route: '/responsables', roles: ['RESPONSABLES_EDITOR'] },
        { name: 'Productos', icon: 'inventory', route: '/productos', roles: ['PRODUCTOS_EDITOR'] },

        // Usuarios: solo admin (según tu regla)
        { name: 'Usuarios', icon: 'people', route: '/usuarios', roles: ['USUARIOS_EDITOR'] },
      ],
    },
  ];

  // Menú filtrado por roles (ADMIN_GENERAL ve todo)
  readonly menuItems = computed<MenuItems[]>(() => {
    const roles = this.auth.currentUser()?.roles ?? [];

    // si no hay roles, no muestres nada
    if (!roles.length) return [];

    // ADMIN_GENERAL ve todo tal cual
    if (roles.includes('ADMIN_GENERAL')) return this.menuItemsSource as MenuItems[];

    const canSee = (item: any): boolean => {
      // si NO definiste roles en el item, no se ve por sí mismo
      // (pero el padre puede verse si tiene hijos visibles)
      if (!item.roles?.length) return false;

      return item.roles.some((r: string) => roles.includes(r));
    };

    const filterTree = (items: any[]): any[] => {
      return items
        .map((it) => {
          const children = it.children?.length ? filterTree(it.children) : undefined;

          const hasVisibleChild = !!children?.length;
          const visibleBySelf = canSee(it);

          // Si no es visible por sí mismo y no tiene hijos visibles -> fuera
          if (!visibleBySelf && !hasVisibleChild) return null;

          // Si tiene hijos, regresamos el item con hijos filtrados
          if (it.children?.length) return { ...it, children };

          return { ...it };
        })
        .filter(Boolean);
    };

    return filterTree(this.menuItemsSource) as MenuItems[];
  });

  logout(): void {
    this.auth.logout();
  }
}