import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ExtraButton, ModuleHeaderAction, ModuleHeaderConfig } from './interfaces/module-header-interface';
import { PermissionsService } from '../../../auth/services/permissions.service';
import { RoleCode } from '../../../auth/interfaces/auth.interface';

@Component({
  selector: 'app-module-header',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
  ],
  templateUrl: './module-header.html',
  styleUrl: './module-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleHeader {
  private readonly permissions = inject(PermissionsService);

  @Input() title: string = '';
  @Input() config: ModuleHeaderConfig = {};
  @Input() extraButtons: ExtraButton[] = [];

  @Output() action = new EventEmitter<ModuleHeaderAction | string>();

  emit(action: ModuleHeaderAction | string): void {
    this.action.emit(action);
  }

  /** centraliza la validación */
  canShow(roles?: RoleCode[]): boolean {
    if (!roles?.length) return true; // si no pides roles, se muestra
    return this.permissions.hasAnyRole(roles);
  }
}
