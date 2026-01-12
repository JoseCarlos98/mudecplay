import { Component, inject, signal } from '@angular/core';
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
import { AuthService } from '../../auth/services/auth.service'; // ajusta ruta si aplica

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

  menuItems: MenuItems[] = [
    { name: 'Gastos', icon: 'attach_money', route: '/gastos' },
    {
      name: 'Catálogos',
      icon: '',
      children: [
        { name: 'Proveedores', icon: 'store', route: 'proveedores' },
        { name: 'Proyectos', icon: 'work', route: 'proyectos' },
        { name: 'Clientes', icon: 'groups', route: 'clientes' },
        { name: 'Responsables', icon: 'person', route: 'responsables' },
        { name: 'Productos', icon: 'inventory', route: 'productos' },
      ],
    },
  ];

  logout(): void {
    this.auth.logout();
  }
}
