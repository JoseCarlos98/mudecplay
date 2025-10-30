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
  imports: [CommonModule, MatTooltipModule, MatButtonModule, RouterModule, MatToolbarModule, MatIconModule, MatListModule, MatExpansionModule, MatSidenavModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  menuItems: MenuItems[] = [
    { name: 'Gastos', icon: 'attach_money', route: '/gastos' },
    // { name: 'Usuarios', icon: 'people', route: '/usuarios' },
    // { name: 'Configuración', icon: 'settings', route: '/configuracion' }
  ];

}