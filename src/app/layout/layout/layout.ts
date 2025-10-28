import { Component, ViewChild } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { MatSidenav, MatSidenavContainer, MatSidenavContent, MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-layout',
imports: [CommonModule, Sidebar, Header, RouterModule,],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  isSidebarCollapsed = true;
  toggleSidebar() { this.isSidebarCollapsed = !this.isSidebarCollapsed; }

  
}
