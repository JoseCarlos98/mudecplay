import { Component } from '@angular/core';
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

@Component({
  selector: 'app-sidebar',
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
  // Menú principal
  menuItems: MenuItems[] = [
    { name: 'Gastos', icon: 'attach_money', route: '/gastos' },
  ];

  // Menú de catálogos
  catalogItems: MenuItems[] = [
    { name: 'Proveedores', icon: '', route: '/proveedores' },
    { name: 'Proyectos', icon: '', route: '/proyectos' },
  ];

  // Estado de despliegue de catálogos
  catalogsOpen = false;

  toggleCatalogs(): void {
    this.catalogsOpen = !this.catalogsOpen;
  }
}
