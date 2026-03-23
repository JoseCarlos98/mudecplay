import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  ColumnsConfig,
  DataTableActionEvent,
  DataTableActionType,
  DataTableExtraAction,
} from './interfaces/table-interfaces';

import type { TableActionPermissions } from './interfaces/table-interfaces';
import { PermissionsService } from '../../../auth/services/permissions.service';
import { RoleCode } from '../../../auth/interfaces/auth.interface';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable<T> implements OnChanges {
  private readonly permissionsService = inject(PermissionsService);

  @Input() displayedColumns: string[] = [];
  @Input() columnsConfig: ColumnsConfig[] = [];
  @Input() data: T[] = [];

  @Input() emptyLabel = 'Sin dato';

  private readonly DEFAULT_DELETE_ROLES: RoleCode[] = ['ADMIN_GENERAL'];

  /** Reglas base */
  @Input() canEdit: (row: T) => boolean = () => true;
  @Input() canDelete: (row: T) => boolean = () => true;
  @Input() editTooltip: (row: T) => string | null = () => null;
  @Input() deleteTooltip: (row: T) => string | null = () => null;

  /**
   * Roles requeridos para mostrar botones base
   * Admin bypass lo maneja PermissionsService.
   */
  @Input() actionPermissions: TableActionPermissions = {};

  /**
   * Botones extra enviados desde el componente padre.
   * Ejemplo: anticipo, cobrar, historial, etc.
   */
  @Input() extraActions: DataTableExtraAction<T>[] = [];

  @Output() action = new EventEmitter<DataTableActionEvent<T>>();

  dataSource = new MatTableDataSource<T>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.dataSource.data = this.data || [];
    }
  }

  onRowAction(type: DataTableActionType, row: T): void {
    this.action.emit({ type, row });
  }

  get editRolesEffective(): RoleCode[] | undefined {
    return this.actionPermissions?.editRoles;
  }

  get deleteRolesEffective(): RoleCode[] | undefined {
    // si no mandas nada, por defecto solo admin puede ver delete
    return this.actionPermissions?.deleteRoles ?? this.DEFAULT_DELETE_ROLES;
  }

  /** helper genérico de roles */
  canShow(roles?: RoleCode[]): boolean {
    if (!roles?.length) return true;
    return this.permissionsService.hasAnyRole(roles);
  }

  /** ---- Extra actions helpers ---- */
  isExtraActionVisible(action: DataTableExtraAction<T>, row: T): boolean {
    return action.visible ? action.visible(row) : true;
  }

  isExtraActionDisabled(action: DataTableExtraAction<T>, row: T): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  getExtraActionTooltip(action: DataTableExtraAction<T>, row: T): string {
    if (!action.tooltip) return '';

    if (typeof action.tooltip === 'function') {
      return action.tooltip(row) ?? '';
    }

    return action.tooltip;
  }

  getExtraActionAriaLabel(action: DataTableExtraAction<T>, row: T): string {
    if (typeof action.ariaLabel === 'function') {
      return action.ariaLabel(row);
    }

    if (typeof action.ariaLabel === 'string' && action.ariaLabel.trim()) {
      return action.ariaLabel;
    }

    const tooltip = this.getExtraActionTooltip(action, row);
    return tooltip || action.type;
  }

  // --- lo demás igual ---
  getRelationValue(value: any, path?: string) {
    if (!value) return null;
    if (!path) return value['name'] ?? null;
    return value[path] ?? null;
  }

  isEmptyValue(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  }

  getEmptyLabel(fallback?: string | null): string {
    return fallback && fallback.trim().length > 0 ? fallback : this.emptyLabel;
  }

  formatPhoneCell(value: any): string {
    if (value == null) return '';
    const raw = String(value).trim();
    if (!raw) return '';

    let country = '';
    let rest = raw;

    if (raw.startsWith('+52')) {
      country = '+52';
      rest = raw.slice(3);
    } else if (raw.startsWith('+')) {
      country = raw.slice(0, 3);
      rest = raw.slice(country.length);
    }

    const digits = rest.replace(/\D/g, '');
    if (!digits) return country || raw;

    if (digits.length <= 3) return `${country} ${digits}`.trim();
    if (digits.length <= 6) {
      return `${country} ${digits.slice(0, 3)} ${digits.slice(3)}`.trim();
    }

    return `${country} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`.trim();
  }
}