import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

@Component({
  selector: 'app-data-table',
  imports: [CommonModule, MatPaginatorModule, MatIconModule, MatTableModule, MatTooltipModule],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.scss']
})
export class DataTable<T> implements AfterViewInit {

  @Input() displayedColumns: string[] = [];
  @Input() columnsConfig: { key: string; label: string }[] = [];
  @Input() data: T[] = [];

  @Output() edit = new EventEmitter<T>();
  @Output() delete = new EventEmitter<T>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<T>();

  ngAfterViewInit() {
    // this.dataSource.paginator = this.paginator;
    // this.paginator.pageSize = pageSize;
    // this.paginator.pageIndex = pageIndex;
  }

  ngOnChanges() {
    this.dataSource.data = this.data || [];
  }

  onEdit(row: T) {
    this.edit.emit(row);
  }

  onDelete(row: T) {
    this.delete.emit(row);
  }
}
