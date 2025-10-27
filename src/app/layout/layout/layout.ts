import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, Sidebar, Header, RouterOutlet, MatSidenavContainer, MatSidenavContent],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  isSidebarOpen: any
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
