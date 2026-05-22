import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../auth/services/auth.service';
import { AuthUser } from '../../auth/interfaces/auth.interface';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Input() isMobile = false;
  @Input() sidebarOpen = false;

  @Output() toggleSidebar = new EventEmitter<void>();

  private readonly auth = inject(AuthService);

  currentUser: AuthUser | null = this.auth.currentUser();

  get userName(): string {
    const name = this.currentUser?.name ?? '';
    const lastName = this.currentUser?.lastName ?? '';

    return `${name} ${lastName}`.trim() || 'Usuario';
  }
}