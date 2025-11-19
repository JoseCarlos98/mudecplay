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
    if (!path) return value;
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
}
