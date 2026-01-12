import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../auth/services/auth.service';
import { AuthUser } from '../../auth/interfaces/auth.interface';
@Component({
  selector: 'app-header',
  imports: [CommonModule, MatIconModule, MatToolbarModule, MatButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Output() toggleSidebar = new EventEmitter<void>();
  private auth = inject(AuthService);
  currentUser: AuthUser | null = this.auth.currentUser();
}
