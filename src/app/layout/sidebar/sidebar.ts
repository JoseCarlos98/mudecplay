import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MenuItems } from './models/siderbar-models';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly auth = inject(AuthService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  readonly isExpanded = signal(false);
  readonly openSectionName = signal<string | null>(null);

  private readonly menuItemsSource: (MenuItems & { roles?: string[] })[] = [
    { name: 'Gastos', icon: 'attach_money', route: '/gastos', roles: ['GASTOS_EDITOR'] },
    { name: 'Cuentas por Cobrar', icon: 'account_balance', route: '/cuentas-por-cobrar', roles: ['CUENTAS_POR_COBRAR_EDITOR'] },
    { name: 'Reportes', icon: 'bar_chart', route: '/reportes', roles: ['REPORTES_EMISOR'] },
    {
      name: 'Mano de obra',
      icon: 'engineering',
      children: [
        {
          name: 'Empleados',
          icon: 'badge',
          route: '/mano-de-obra/empleados',
          roles: ['EMPLEADOS_EDITOR'],
        },
        {
          name: 'Asistencia diaria',
          icon: 'fact_check',
          route: '/mano-de-obra/asistencia-diaria',
          roles: ['ASISTENCIA_EDITOR'],
        },
        {
          name: 'Llegadas y retardos',
          icon: 'schedule',
          route: '/mano-de-obra/llegadas-retardos',
          roles: ['LLEGADAS_RETARDOS_EDITOR'],
        },
        {
          name: 'Horas extras',
          icon: 'more_time',
          route: '/mano-de-obra/horas-extras',
          roles: ['HORAS_EXTRAS_EDITOR'],
        },
        {
          name: 'Préstamos',
          icon: 'payments',
          route: '/mano-de-obra/prestamos',
          roles: ['PRESTAMOS_EDITOR'],
        },
        {
          name: 'Nómina',
          icon: 'receipt_long',
          route: '/mano-de-obra/nomina',
          roles: ['NOMINA_EDITOR'],
        },
      ],
    },
    {
      name: 'Catálogos',
      icon: 'folder_open',
      children: [
        { name: 'Proveedores', icon: 'store', route: '/proveedores', roles: ['PROVEEDORES_EDITOR'] },
        { name: 'Proyectos', icon: 'work', route: '/proyectos', roles: ['PROYECTOS_EDITOR'] },
        { name: 'Áreas', icon: 'grid_view', route: '/areas', roles: ['AREA_EDITOR'] },
        { name: 'Áreas de Empleados', icon: 'grid_view', route: '/areas-empleados', roles: ['AREAS_EMPLEADOS_EDITOR'] },
        { name: 'Clientes', icon: 'groups', route: '/clientes', roles: ['CLIENTES_EDITOR'] },
        { name: 'Responsables', icon: 'person', route: '/responsables', roles: ['RESPONSABLES_EDITOR'] },
        { name: 'Productos', icon: 'inventory', route: '/productos', roles: ['PRODUCTOS_EDITOR'] },
        { name: 'Usuarios', icon: 'people', route: '/usuarios', roles: ['USUARIOS_EDITOR'] },
      ],
    },
  ];

  readonly menuItems = computed<MenuItems[]>(() => {
    const roles = this.auth.currentUser()?.roles ?? [];

    if (!roles.length) return [];

    if (roles.includes('ADMIN_GENERAL')) {
      return this.menuItemsSource as MenuItems[];
    }

    const canSee = (item: any): boolean => {
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

          if (it.children?.length) return { ...it, children };
          return { ...it };
        })
        .filter(Boolean);
    };

    return filterTree(this.menuItemsSource) as MenuItems[];
  });

  expand(): void {
    this.isExpanded.set(true);
  }

  collapse(): void {
    this.isExpanded.set(false);
  }

  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.hostRef.nativeElement.contains(next)) {
      this.collapse();
    }
  }

  hasChildren(item: MenuItems): boolean {
    return !!item.children?.length;
  }

  isSectionOpen(itemName: string): boolean {
    return this.openSectionName() === itemName;
  }

  toggleSection(item: MenuItems, ev?: Event): void {
    ev?.stopPropagation();

    if (!item.children?.length) return;

    if (!this.isExpanded()) {
      this.isExpanded.set(true);
      this.openSectionName.set(item.name);
      return;
    }

    this.openSectionName.update((current) =>
      current === item.name ? null : item.name,
    );
  }

  logout(): void {
    this.auth.logout();
  }
}