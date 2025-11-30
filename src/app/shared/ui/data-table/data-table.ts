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
import { ColumnsConfig, DataTableActionEvent, DataTableActionType } from './interfaces/table-interfaces';


@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTable<T> implements OnChanges {
  @Input() displayedColumns: string[] = [];
  @Input() columnsConfig: ColumnsConfig[] = [];
  @Input() data: T[] = [];

  @Output() action = new EventEmitter<DataTableActionEvent<T>>();

  dataSource = new MatTableDataSource<T>();

  getRelationValue(value: any, path?: string) {
    if (!value) return null;
    if (!path) return value['name'] ?? null;
    return value[path] ?? null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.dataSource.data = this.data || [];
    }
  }

  onRowAction(type: DataTableActionType, row: T) {
    this.action.emit({ type, row });
  }

  formatPhoneCell(value: any): string {
    if (value == null) return '';
    const raw = String(value).trim();
    if (!raw) return '';

    let country = '';
    let rest = raw;

    if (raw.startsWith('+52')) {
      country = '+52';
      rest = raw.slice(3); // quitamos "+52"
    } else if (raw.startsWith('+')) {
      // fallback genérico: deja el prefijo tal cual los primeros 3 chars
      country = raw.slice(0, 3);
      rest = raw.slice(country.length);
    }

    const digits = rest.replace(/\D/g, '');
    if (!digits) return country || raw;

    // Mismo estilo que usas en los inputs: 3-3-4
    if (digits.length <= 3) return `${country} ${digits}`.trim();

    if (digits.length <= 6) return `${country} ${digits.slice(0, 3)} ${digits.slice(3)}`.trim();
    return `${country} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`.trim();
  }
}
