import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { MatSidenav, MatSidenavContainer, MatSidenavContent, MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, Sidebar, Header, RouterOutlet, MatSidenavContainer, MatSidenavContent, MatSidenavModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  toggleSidebar() {
    if (this.sidenav) {
      this.sidenav.toggle();
    }
  }
}
