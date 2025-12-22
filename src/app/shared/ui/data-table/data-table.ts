import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
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
} from './interfaces/table-interfaces';

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
  @Input() displayedColumns: string[] = [];
  @Input() columnsConfig: ColumnsConfig[] = [];
  @Input() data: T[] = [];

  @Input() emptyLabel = 'Sin dato';

  /** Reglas de acciones (por defecto: todo permitido, sin tooltip) */
  @Input() canEdit: (row: T) => boolean = () => true;
  @Input() canDelete: (row: T) => boolean = () => true;
  @Input() editTooltip: (row: T) => string | null = () => null;
  @Input() deleteTooltip: (row: T) => string | null = () => null;

  @Output() action = new EventEmitter<DataTableActionEvent<T>>();

  dataSource = new MatTableDataSource<T>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.dataSource.data = this.data || [];
    }
  }

  onRowAction(type: DataTableActionType, row: T) {
    this.action.emit({ type, row });
  }

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
    if (digits.length <= 6)
      return `${country} ${digits.slice(0, 3)} ${digits.slice(3)}`.trim();
    return `${country} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`.trim();
  }
}
