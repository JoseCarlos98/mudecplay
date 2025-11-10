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

export interface ColumnsConfig {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

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
  /** columnas que se muestran en la tabla (incluye 'actions') */
  @Input() displayedColumns: string[] = [];

  /** configuración de columnas dinámicas */
  @Input() columnsConfig: ColumnsConfig[] = [];

  /** datos a renderizar */
  @Input() data: T[] = [];

  /** eventos de acciones */
  @Output() edit = new EventEmitter<T>();
  @Output() delete = new EventEmitter<T>();

  /** datasource de material */
  dataSource = new MatTableDataSource<T>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.dataSource.data = this.data || [];
    }
  }

  onEdit(row: T) {
    this.edit.emit(row);
  }

  onDelete(row: T) {
    this.delete.emit(row);
  }
}
