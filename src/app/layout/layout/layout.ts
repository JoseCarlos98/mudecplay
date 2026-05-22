import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, Sidebar, Header, RouterModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit {
  readonly isMobile = signal(false);
  readonly mobileSidebarOpen = signal(false);

  ngOnInit(): void {
    this.syncViewportState();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportState();
  }

  toggleMobileSidebar(): void {
    if (!this.isMobile()) return;

    this.mobileSidebarOpen.update((open) => !open);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  private syncViewportState(): void {
    if (typeof window === 'undefined') return;

    const nextIsMobile = window.innerWidth <= 875;

    this.isMobile.set(nextIsMobile);

    if (!nextIsMobile) {
      this.mobileSidebarOpen.set(false);
    }
  }
}