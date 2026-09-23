import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
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
  DataTableExpandedRowContext,
  DataTableExtraAction,
  DataTableRowExpansionEvent,
  DataTableRowKey,
} from './interfaces/table-interfaces';

import type {
  ColumnVariant,
  DataTableSortDirection,
  DataTableSortEvent,
  DataTableSortItem,
  TableActionPermissions,
} from './interfaces/table-interfaces';

import { PermissionsService } from '../../../auth/services/permissions.service';
import { RoleCode } from '../../../auth/interfaces/auth.interface';
import { ActionPopover } from './components/action-popover/action-popover';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    ActionPopover,
  ],
  templateUrl: './data-table.html',
  styleUrls: ['./data-table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable<T> implements OnChanges {
  private readonly permissionsService = inject(PermissionsService);
  private readonly DEFAULT_DELETE_ROLES: RoleCode[] = ['ADMIN_GENERAL'];

  @Input() displayedColumns: string[] = [];
  @Input() columnsConfig: ColumnsConfig[] = [];
  @Input() data: T[] = [];
  @Input() emptyLabel = 'Sin dato';

  @Input() sorts: DataTableSortItem[] = [];

  /** Reglas base */
  @Input() canEdit: (row: T) => boolean = () => true;
  @Input() canDelete: (row: T) => boolean = () => true;
  @Input() editTooltip: (row: T) => string | null = () => null;
  @Input() deleteTooltip: (row: T) => string | null = () => null;

  /**
   * Roles requeridos para mostrar botones base.
   * Admin bypass lo maneja PermissionsService.
   */
  @Input() actionPermissions: TableActionPermissions = {};

  /**
   * Botones extra enviados desde el componente padre.
   */
  @Input() extraActions: DataTableExtraAction<T>[] = [];

  /**
   * Activa la primera columna con el botón para expandir una fila.
   * Por defecto está apagado para no modificar las tablas existentes.
   */
  @Input() expandable = false;

  /**
   * Plantilla enviada desde el componente padre.
   */
  @Input()
  expandedRowTemplate: TemplateRef<DataTableExpandedRowContext<T>> | null =
    null;

  /**
   * Permite deshabilitar la expansión para filas específicas.
   */
  @Input() canExpand: (row: T) => boolean = () => true;

  /**
   * Tooltip opcional del botón de expansión.
   */
  @Input() expandTooltip:
    | string
    | ((row: T) => string | null)
    | null = null;

  /**
   * Identidad estable para conservar la expansión al refrescar data.
   * Por defecto usa row.id; si no existe, usa la posición.
   */
  @Input() rowKeyResolver: (row: T) => DataTableRowKey = (row: T) => {
    const id = (row as { id?: unknown } | null)?.id;

    if (typeof id === 'string' || typeof id === 'number') {
      return id;
    }

    return this.data.indexOf(row);
  };

  @Output() action = new EventEmitter<DataTableActionEvent<T>>();

  @Output() rowExpansionChange =
    new EventEmitter<DataTableRowExpansionEvent<T>>();

  @Output() sortChange =
    new EventEmitter<DataTableSortEvent>();

  readonly dataSource = new MatTableDataSource<T>();

  readonly detailRowPredicate = (
    _index: number,
    _row: T,
  ): boolean => this.expandable;

  renderedColumns: string[] = [];
  expandedRowKey: DataTableRowKey | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['displayedColumns'] || changes['expandable']) {
      this.updateRenderedColumns();
    }

    if (
      changes['rowKeyResolver'] &&
      !changes['rowKeyResolver'].firstChange
    ) {
      this.expandedRowKey = null;
    }

    if (changes['data'] || changes['expandable']) {
      this.dataSource.data = [...(this.data || [])];
      this.keepValidExpandedRow();
    }

    if (!this.expandable) {
      this.expandedRowKey = null;
    }
  }

  isSortableColumn(
    col: ColumnsConfig,
  ): boolean {
    return col.sortable === true;
  }

  getSortKey(
    col: ColumnsConfig,
  ): string {
    return col.sortKey || col.key;
  }

  getSortItem(
    col: ColumnsConfig,
  ): DataTableSortItem | null {

    if (!this.isSortableColumn(col)) {
      return null;
    }

    const sortKey =
      this.getSortKey(col);

    return (
      this.sorts || []
    ).find(
      (sort) =>
        sort.key === sortKey,
    ) ?? null;
  }

  isColumnSorted(
    col: ColumnsConfig,
  ): boolean {
    return !!this.getSortItem(col);
  }

  getSortPriority(
    col: ColumnsConfig,
  ): number | null {

    if (!this.isSortableColumn(col)) {
      return null;
    }

    const sortKey =
      this.getSortKey(col);

    const index =
      (
        this.sorts || []
      ).findIndex(
        (sort) =>
          sort.key === sortKey,
      );

    return index >= 0
      ? index + 1
      : null;
  }

  getSortIcon(
    col: ColumnsConfig,
  ): string {

    const sort =
      this.getSortItem(col);

    if (!sort) {
      return 'unfold_more';
    }

    return sort.direction === 'asc'
      ? 'arrow_upward'
      : 'arrow_downward';
  }

  getSortTooltip(
    col: ColumnsConfig,
  ): string {

    const sort =
      this.getSortItem(col);

    if (!sort) {
      return `Ordenar ${col.label} ascendente`;
    }

    if (sort.direction === 'asc') {
      return `Ordenar ${col.label} descendente`;
    }

    return `Quitar ordenamiento de ${col.label}`;
  }

  onSortColumn(
    col: ColumnsConfig,
    event?: Event,
  ): void {

    event?.stopPropagation();

    if (!this.isSortableColumn(col)) {
      return;
    }

    const sortKey =
      this.getSortKey(col);

    const currentSorts:
      DataTableSortItem[] = [
        ...(this.sorts || []),
      ];

    const currentIndex =
      currentSorts.findIndex(
        (sort) =>
          sort.key === sortKey,
      );

    /*
     * No está ordenada:
     * se agrega al final como ASC.
     */
    if (currentIndex === -1) {

      this.sortChange.emit({
        sorts: [
          ...currentSorts,
          {
            key: sortKey,
            direction: 'asc',
          },
        ],
      });

      return;
    }

    const currentSort =
      currentSorts[currentIndex];

    /*
     * Si ya está activa,
     * únicamente alternamos ASC <-> DESC.
     *
     * La X será la responsable
     * de eliminar el ordenamiento.
     */
    const nextDirection:
      DataTableSortDirection =
      currentSort.direction === 'asc'
        ? 'desc'
        : 'asc';

    const nextSorts =
      currentSorts.map(
        (sort, index) =>
          index === currentIndex
            ? {
              ...sort,
              direction:
                nextDirection,
            }
            : sort,
      );

    this.sortChange.emit({
      sorts:
        nextSorts,
    });
  }

  clearSortColumn(
    col: ColumnsConfig,
    event?: Event,
  ): void {

    event?.preventDefault();
    event?.stopPropagation();

    if (!this.isSortableColumn(col)) {
      return;
    }

    const sortKey =
      this.getSortKey(col);

    const nextSorts =
      (this.sorts || [])
        .filter(
          (sort) =>
            sort.key !== sortKey,
        );

    this.sortChange.emit({
      sorts:
        nextSorts,
    });
  }

  onRowAction(type: DataTableActionType, row: T): void {
    this.action.emit({ type, row });
  }

  toggleRow(row: T, event?: Event): void {
    event?.stopPropagation();

    if (!this.expandable || !this.canExpandRow(row)) {
      return;
    }

    const rowKey = this.getRowKey(row);
    const expanded = this.expandedRowKey !== rowKey;

    this.expandedRowKey = expanded ? rowKey : null;

    this.rowExpansionChange.emit({
      row,
      expanded,
    });
  }

  collapseExpandedRow(): void {
    this.expandedRowKey = null;
  }

  isRowExpanded(row: T): boolean {
    return (
      this.expandable &&
      this.expandedRowKey !== null &&
      this.expandedRowKey === this.getRowKey(row)
    );
  }

  canExpandRow(row: T): boolean {
    return this.canExpand ? this.canExpand(row) : true;
  }

  getExpandTooltip(row: T): string {
    if (this.expandTooltip) {
      if (typeof this.expandTooltip === 'function') {
        return this.expandTooltip(row) ?? '';
      }

      return this.expandTooltip;
    }

    return this.isRowExpanded(row)
      ? 'Ocultar detalle'
      : 'Ver detalle';
  }

  getExpandedRowContext(
    row: T,
  ): DataTableExpandedRowContext<T> {
    return {
      $implicit: row,
      row,
    };
  }

  get editRolesEffective(): RoleCode[] | undefined {
    return this.actionPermissions?.editRoles;
  }

  get deleteRolesEffective(): RoleCode[] | undefined {
    return (
      this.actionPermissions?.deleteRoles ??
      this.DEFAULT_DELETE_ROLES
    );
  }

  canShow(roles?: RoleCode[]): boolean {
    if (!roles?.length) return true;

    return this.permissionsService.hasAnyRole(roles);
  }

  isExtraActionVisible(
    action: DataTableExtraAction<T>,
    row: T,
  ): boolean {
    return action.visible ? action.visible(row) : true;
  }

  isExtraActionDisabled(
    action: DataTableExtraAction<T>,
    row: T,
  ): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  getExtraActionTooltip(
    action: DataTableExtraAction<T>,
    row: T,
  ): string {
    if (!action.tooltip) return '';

    if (typeof action.tooltip === 'function') {
      return action.tooltip(row) ?? '';
    }

    return action.tooltip;
  }

  getExtraActionPopover(
    action: DataTableExtraAction<T>,
    row: T,
  ) {
    if (!action.popoverContent) return null;

    return action.popoverContent(row);
  }

  getColumnVariant(
    col: ColumnsConfig,
    row: T,
  ): ColumnVariant | undefined {
    const resolved = col.variantResolver
      ? col.variantResolver(row)
      : null;

    return resolved ?? col.typeVariant ?? undefined;
  }

  getColumnPopover(col: ColumnsConfig, row: T) {
    if (!col.popoverContent) return null;

    return col.popoverContent(row);
  }

  getRelationValue(value: any, path?: string) {
    if (!value) return null;
    if (!path) return value['name'] ?? null;

    return value[path] ?? null;
  }

  isEmptyValue(value: any): boolean {
    if (value === null || value === undefined) return true;

    if (
      typeof value === 'string' &&
      value.trim() === ''
    ) {
      return true;
    }

    return false;
  }

  getEmptyLabel(fallback?: string | null): string {
    return fallback && fallback.trim().length > 0
      ? fallback
      : this.emptyLabel;
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

    if (digits.length <= 3) {
      return `${country} ${digits}`.trim();
    }

    if (digits.length <= 6) {
      return `${country} ${digits.slice(0, 3)} ${digits.slice(3)}`.trim();
    }

    return `${country} ${digits.slice(0, 3)} ${digits.slice(
      3,
      6,
    )} ${digits.slice(6)}`.trim();
  }

  get showEditEffective(): boolean {
    return this.actionPermissions?.showEdit ?? true;
  }

  get showDeleteEffective(): boolean {
    return this.actionPermissions?.showDelete ?? true;
  }

  isRowSelected(col: ColumnsConfig, row: T): boolean {
    return col.selectedResolver
      ? col.selectedResolver(row)
      : false;
  }

  isSelectDisabled(
    col: ColumnsConfig,
    row: T,
  ): boolean {
    return col.selectDisabledResolver
      ? col.selectDisabledResolver(row)
      : false;
  }

  getSelectTooltip(
    col: ColumnsConfig,
    row: T,
  ): string {
    if (!col.selectTooltip) return '';

    if (typeof col.selectTooltip === 'function') {
      return col.selectTooltip(row) ?? '';
    }

    return col.selectTooltip;
  }

  onSelectColumn(
    col: ColumnsConfig,
    row: T,
  ): void {
    this.onRowAction(
      col.selectActionType || 'select',
      row,
    );
  }

  getExtraActionIconClass(
    action: DataTableExtraAction<T>,
    row: T,
  ): string {
    if (!action.iconClass) return '';

    if (typeof action.iconClass === 'function') {
      return action.iconClass(row) ?? '';
    }

    return action.iconClass;
  }

  private updateRenderedColumns(): void {
    const baseColumns = (
      this.displayedColumns || []
    ).filter(
      (column) =>
        column !== 'expand' &&
        column !== 'expandedDetail',
    );

    this.renderedColumns = this.expandable
      ? ['expand', ...baseColumns]
      : baseColumns;
  }

  private keepValidExpandedRow(): void {
    if (this.expandedRowKey === null) return;

    const expandedRowStillExists = (
      this.data || []
    ).some(
      (row) =>
        this.getRowKey(row) === this.expandedRowKey,
    );

    if (!expandedRowStillExists) {
      this.expandedRowKey = null;
    }
  }

  private getRowKey(row: T): DataTableRowKey {
    return this.rowKeyResolver(row);
  }
}