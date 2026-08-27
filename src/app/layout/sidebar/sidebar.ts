import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

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
    MatButtonModule,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  @Input() isMobile = false;
  @Input() mobileOpen = false;

  @Output() mobileClose = new EventEmitter<void>();

  private readonly auth = inject(AuthService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  readonly isExpanded = signal(false);
  readonly openSectionName = signal<string | null>(null);

  private readonly menuItemsSource: (MenuItems & { roles?: string[] })[] = [
    {
      name: 'Gastos',
      icon: 'attach_money',
      route: '/gastos',
      roles: ['GASTOS_EDITOR'],
    },
    {
      name: 'Almacén',
      icon: 'inventory_2',
      route: '/almacen',
      roles: ['ALMACEN_EDITOR'],
    },
    {
      name: 'Cuentas por Cobrar',
      icon: 'account_balance',
      route: '/cuentas-por-cobrar',
      roles: ['CUENTAS_POR_COBRAR_EDITOR'],
    },
    {
      name: 'Reportes',
      icon: 'bar_chart',
      route: '/reportes',
      roles: ['REPORTES_EMISOR'],
    },
    {
      name: 'Tesorería',
      icon: 'account_balance_wallet',
      children: [
        {
          name: 'Cuentas bancarias',
          icon: 'account_balance',
          route: '/tesoreria/cuentas-bancarias',
          roles: ['ADMIN_GENERAL', 'TESORERIA_CUENTAS_BANCARIAS_EDITOR'],
        },
        {
          name: 'Cargar movimientos',
          icon: 'upload_file',
          route: '/tesoreria/cargar-movimientos',
          roles: ['ADMIN_GENERAL', 'TESORERIA_MOVIMIENTOS_BANCARIOS_IMPORTADOR'],
        },
        {
          name: 'Movimientos bancarios',
          icon: 'receipt_long',
          route: '/tesoreria/movimientos-bancarios',
          roles: [
            'ADMIN_GENERAL',
            'TESORERIA_MOVIMIENTOS_BANCARIOS_CONSULTOR',
            'TESORERIA_MOVIMIENTOS_BANCARIOS_IMPORTADOR',
          ],
        },
        {
          name: 'Importaciones',
          icon: 'folder_copy',
          route: '/tesoreria/importaciones',
          roles: [
            'ADMIN_GENERAL',
            'TESORERIA_MOVIMIENTOS_BANCARIOS_CONSULTOR',
            'TESORERIA_MOVIMIENTOS_BANCARIOS_IMPORTADOR',
          ],
        },

        // Fases siguientes: las activamos cuando exista backend/frontend.
        {
          name: 'Cuentas por pagar',
          icon: 'payments',
          route: '/tesoreria/cuentas-por-pagar',
          roles: ['ADMIN_GENERAL', 'TESORERIA_CUENTAS_POR_PAGAR_EDITOR'],
        },
        {
          name: 'Cuentas por cobrar',
          icon: 'request_quote',
          route: '/tesoreria/cuentas-por-cobrar',
          roles: ['ADMIN_GENERAL', 'TESORERIA_CUENTAS_POR_COBRAR_EDITOR'],
        },
        // {
        //   name: 'Flujo de efectivo',
        //   icon: 'trending_up',
        //   route: '/tesoreria/flujo-efectivo',
        //   roles: ['ADMIN_GENERAL', 'TESORERIA_FLUJO_EFECTIVO_CONSULTOR'],
        // },
        // {
        //   name: 'Reportes',
        //   icon: 'bar_chart',
        //   route: '/tesoreria/reportes',
        //   roles: ['ADMIN_GENERAL', 'TESORERIA_REPORTES_EMISOR'],
        // },
      ],
    },
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
        // {
        //   name: 'Horas extras',
        //   icon: 'more_time',
        //   route: '/mano-de-obra/horas-extras',
        //   roles: ['HORAS_EXTRAS_EDITOR'],
        // },
        // {
        //   name: 'Préstamos',
        //   icon: 'payments',
        //   route: '/mano-de-obra/prestamos',
        //   roles: ['PRESTAMOS_EDITOR'],
        // },
        // {
        //   name: 'Nómina',
        //   icon: 'receipt_long',
        //   route: '/mano-de-obra/nomina',
        //   roles: ['NOMINA_EDITOR'],
        // },
      ],
    },
    {
      name: 'Órdenes de compra',
      icon: 'receipt_long',
      children: [
        {
          name: 'Órdenes',
          icon: 'list_alt',
          route: '/ordenes-compra',
          roles: ['ORDENES_COMPRA_EDITOR'],
        },
        {
          name: 'Reportes',
          icon: 'bar_chart',
          route: '/ordenes-compra/reportes',
          roles: ['ORDENES_COMPRA_EDITOR'],
        },
        {
          name: 'Subir Ticket de gasto',
          icon: 'image_search',
          route: '/ordenes-compra/subir-ticket-gasto',
          roles: ['ORDENES_COMPRA_TICKETS_SUBIDOR'],
        },
        {
          name: 'Fotos sin gasto',
          icon: 'image_search',
          route: '/ordenes-compra/fotos-sin-gasto',
          roles: ['ORDENES_COMPRA_FOTOS_SIN_GASTO_EDITOR'],
        },
      ],
    },
    {
      name: 'Catálogos',
      icon: 'folder_open',
      children: [
        {
          name: 'Proveedores',
          icon: 'store',
          route: '/proveedores',
          roles: ['PROVEEDORES_EDITOR'],
        },
        {
          name: 'Proyectos',
          icon: 'work',
          route: '/proyectos',
          roles: ['PROYECTOS_EDITOR'],
        },
        {
          name: 'Áreas',
          icon: 'grid_view',
          route: '/areas',
          roles: ['AREAS_EDITOR'],
        },
        {
          name: 'Áreas de Empleados',
          icon: 'grid_view',
          route: '/areas-empleados',
          roles: ['AREAS_EMPLEADOS_EDITOR'],
        },
        {
          name: 'Clientes',
          icon: 'groups',
          route: '/clientes',
          roles: ['CLIENTES_EDITOR'],
        },
        {
          name: 'Responsables',
          icon: 'person',
          route: '/responsables',
          roles: ['RESPONSABLES_EDITOR'],
        },
        {
          name: 'Productos',
          icon: 'inventory',
          route: '/productos',
          roles: ['PRODUCTOS_EDITOR'],
        },
        {
          name: 'Usuarios',
          icon: 'people',
          route: '/usuarios',
          roles: ['USUARIOS_EDITOR'],
        },
      ],
    },
  ];

  readonly menuItems = computed<MenuItems[]>(() => {
    const roles = this.auth.currentUser()?.roles ?? [];

    if (!roles.length) return [];

    if (roles.includes('ADMIN_GENERAL')) {
      return this.menuItemsSource as MenuItems[];
    }

    const canSee = (item: MenuItems & { roles?: string[] }): boolean => {
      if (!item.roles?.length) return false;
      return item.roles.some((role) => roles.includes(role));
    };

    const filterTree = (
      items: (MenuItems & { roles?: string[] })[],
    ): MenuItems[] => {
      return items
        .map((item) => {
          const children = item.children?.length
            ? filterTree(item.children as (MenuItems & { roles?: string[] })[])
            : undefined;

          const hasVisibleChild = !!children?.length;
          const visibleBySelf = canSee(item);

          if (!visibleBySelf && !hasVisibleChild) return null;

          if (item.children?.length) {
            return {
              ...item,
              children,
            };
          }

          return { ...item };
        })
        .filter(Boolean) as MenuItems[];
    };

    return filterTree(this.menuItemsSource);
  });

  isOpen(): boolean {
    return this.isMobile ? this.mobileOpen : this.isExpanded();
  }

  expand(): void {
    if (this.isMobile) return;

    this.isExpanded.set(true);
  }

  collapse(): void {
    if (this.isMobile) return;

    this.isExpanded.set(false);
  }

  onFocusOut(event: FocusEvent): void {
    if (this.isMobile) return;

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

    if (!this.isOpen()) {
      this.isExpanded.set(true);
      this.openSectionName.set(item.name);
      return;
    }

    this.openSectionName.update((current) =>
      current === item.name ? null : item.name,
    );
  }

  onMenuItemClick(): void {
    if (!this.isMobile) return;

    this.mobileClose.emit();
  }

  requestMobileClose(): void {
    this.mobileClose.emit();
  }

  logout(): void {
    this.mobileClose.emit();
    this.auth.logout();
  }
}