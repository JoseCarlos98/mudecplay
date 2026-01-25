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
    {
      name: 'Reportes',
      icon: 'bar_chart',
      route: '/reportes',
      roles: ['GASTOS_EDITOR']
    },
    {
      name: 'Catálogos',
      icon: '',
      roles: ['ADMIN_GENERAL'],
      children: [
        { name: 'Proveedores', icon: 'store', route: '/proveedores' },
        { name: 'Proyectos', icon: 'work', route: '/proyectos' },
        { name: 'Clientes', icon: 'groups', route: '/clientes' },
        { name: 'Responsables', icon: 'person', route: '/responsables' },
        { name: 'Productos', icon: 'inventory', route: '/productos' },
        { name: 'Usuarios', icon: 'people', route: '/usuarios' },
      ],
    },
  ];

  // Menú filtrado por roles (ADMIN_GENERAL ve todo)
  readonly menuItems = computed<MenuItems[]>(() => {
    const roles = this.auth.currentUser()?.roles ?? [];

    // si no hay roles (no logeado), no muestres nada
    if (!roles.length) return [];

    // ADMIN_GENERAL ve todo
    if (roles.includes('ADMIN_GENERAL')) return this.menuItemsSource as MenuItems[];

    const canSee = (item: any): boolean => {
      // ADMIN_GENERAL ve todo
      if (roles.includes('ADMIN_GENERAL')) return true;

      // si NO definiste roles, NO se ve (evita fugas)
      if (!item.roles?.length) return false;

      return item.roles.some((r: string) => roles.includes(r));
    };

    const filterTree = (items: any[]): any[] => {
      return items
        .map((it) => {
          const children = it.children?.length ? filterTree(it.children) : undefined;

          const hasVisibleChild = !!children?.length;
          const visibleBySelf = canSee(it);

          if (!visibleBySelf && !hasVisibleChild) return null;

          return { ...it, children };
        })
        .filter(Boolean);
    };

    return filterTree(this.menuItemsSource) as MenuItems[];
  });

  logout(): void {
    this.auth.logout();
  }
}
