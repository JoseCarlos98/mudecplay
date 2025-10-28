import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { NavigationService } from '../navigation.service';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MatTooltipModule, MatButtonModule, RouterModule, MatToolbarModule, MatIconModule, MatListModule, MatExpansionModule, MatSidenavModule],

  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  menuItems:any = [
    { name: 'Gastos', icon: 'dashboard', route: '/' },
    { name: 'Usuarios', icon: 'people', route: '/usuarios' },
    { name: 'Configuración', icon: 'settings', route: '/configuracion' }
  ];


  ngOnInit(): void {
    
  }
}