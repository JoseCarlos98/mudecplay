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

import {
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';

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
  DataTableSortDirection,
  DataTableSortEvent,
  DataTableSortItem,
} from './interfaces/table-interfaces';

import type {
  ColumnVariant,
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

  styleUrls: [
    './data-table.scss',
  ],

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class DataTable<T>
  implements OnChanges {

  private readonly permissionsService =
    inject(PermissionsService);

  private readonly DEFAULT_DELETE_ROLES:
    RoleCode[] = [
      'ADMIN_GENERAL',
    ];

  // ==========================
  // INPUTS BASE
  // ==========================

  @Input()
  displayedColumns:
    string[] = [];

  @Input()
  columnsConfig:
    ColumnsConfig[] = [];

  @Input()
  data:
    T[] = [];

  @Input()
  emptyLabel =
    'Sin dato';

  /**
   * Ordenamientos activos.
   *
   * La DataTable NO ordena
   * los registros localmente.
   *
   * El componente padre
   * mantiene el estado y
   * consulta el backend.
   */
  @Input()
  sorts:
    DataTableSortItem[] = [];

  // ==========================
  // REGLAS BASE
  // ==========================

  @Input()
  canEdit:
    (row: T) => boolean =
    () => true;

  @Input()
  canDelete:
    (row: T) => boolean =
    () => true;

  @Input()
  editTooltip:
    (row: T) =>
      string | null =
    () => null;

  @Input()
  deleteTooltip:
    (row: T) =>
      string | null =
    () => null;

  /**
   * Roles requeridos para
   * mostrar botones base.
   *
   * Admin bypass lo maneja
   * PermissionsService.
   */
  @Input()
  actionPermissions:
    TableActionPermissions = {};

  /**
   * Botones extra enviados
   * desde el componente padre.
   */
  @Input()
  extraActions:
    DataTableExtraAction<T>[] = [];

  // ==========================
  // EXPANSIÓN
  // ==========================

  /**
   * Activa la primera columna
   * con botón para expandir.
   *
   * Por defecto apagado para
   * no modificar tablas
   * existentes.
   */
  @Input()
  expandable =
    false;

  /**
   * Plantilla enviada desde
   * el componente padre.
   */
  @Input()
  expandedRowTemplate:
    TemplateRef<
      DataTableExpandedRowContext<T>
    > | null =
    null;

  /**
   * Permite deshabilitar
   * expansión por fila.
   */
  @Input()
  canExpand:
    (row: T) => boolean =
    () => true;

  /**
   * Tooltip opcional del
   * botón de expansión.
   */
  @Input()
  expandTooltip:
    | string
    | (
        (
          row: T,
        ) => string | null
      )
    | null =
    null;

  /**
   * Identidad estable para
   * conservar expansión.
   *
   * Por defecto usa row.id.
   */
  @Input()
  rowKeyResolver:
    (
      row: T,
    ) => DataTableRowKey =
    (
      row: T,
    ) => {

      const id =
        (
          row as
            | {
                id?: unknown;
              }
            | null
        )?.id;

      if (
        typeof id === 'string' ||
        typeof id === 'number'
      ) {
        return id;
      }

      return this.data.indexOf(
        row,
      );
    };

  // ==========================
  // OUTPUTS
  // ==========================

  @Output()
  action =
    new EventEmitter<
      DataTableActionEvent<T>
    >();

  @Output()
  rowExpansionChange =
    new EventEmitter<
      DataTableRowExpansionEvent<T>
    >();

  @Output()
  sortChange =
    new EventEmitter<
      DataTableSortEvent
    >();

  // ==========================
  // DATA SOURCE
  // ==========================

  readonly dataSource =
    new MatTableDataSource<T>();

  readonly detailRowPredicate =
    (
      _index: number,
      _row: T,
    ): boolean =>
      this.expandable;

  renderedColumns:
    string[] = [];

  expandedRowKey:
    DataTableRowKey | null =
    null;

  // ==========================
  // LIFECYCLE
  // ==========================

  ngOnChanges(
    changes:
      SimpleChanges,
  ): void {

    if (
      changes[
        'displayedColumns'
      ] ||
      changes[
        'expandable'
      ]
    ) {
      this.updateRenderedColumns();
    }

    if (
      changes[
        'rowKeyResolver'
      ] &&
      !changes[
        'rowKeyResolver'
      ].firstChange
    ) {
      this.expandedRowKey =
        null;
    }

    if (
      changes['data'] ||
      changes['expandable']
    ) {
      this.dataSource.data = [
        ...(this.data || []),
      ];

      this.keepValidExpandedRow();
    }

    if (
      !this.expandable
    ) {
      this.expandedRowKey =
        null;
    }
  }

  // ==========================
  // ORDENAMIENTO
  // ==========================

  /**
   * Indica si la tabla tiene
   * al menos una columna
   * configurada como sortable.
   *
   * Se utiliza para mostrar
   * el icono informativo
   * solamente cuando aplica.
   */
  hasSortableColumns():
    boolean {

    return (
      this.columnsConfig || []
    ).some(
      (
        col,
      ) =>
        col.sortable === true,
    );
  }

  /**
   * Ayuda breve mostrada en
   * el icono de información.
   */
  getSortInfoTooltip():
    string {

    return (
      'Puedes ordenar por varias columnas. ' +
      'El número indica la prioridad: ' +
      '1 es el criterio principal y 2 el siguiente. ' +
      'Usa × para quitar un criterio.'
    );
  }

  isSortableColumn(
    col:
      ColumnsConfig,
  ): boolean {

    return (
      col.sortable === true
    );
  }

  /**
   * Clave real que recibe
   * el componente padre.
   *
   * Si existe sortKey,
   * se usa.
   *
   * Si no, se utiliza key.
   */
  getSortKey(
    col:
      ColumnsConfig,
  ): string {

    return (
      col.sortKey ||
      col.key
    );
  }

  getSortItem(
    col:
      ColumnsConfig,
  ):
    DataTableSortItem |
    null {

    if (
      !this.isSortableColumn(
        col,
      )
    ) {
      return null;
    }

    const sortKey =
      this.getSortKey(
        col,
      );

    return (
      (
        this.sorts ||
        []
      ).find(
        (
          sort,
        ) =>
          sort.key ===
          sortKey,
      ) ??
      null
    );
  }

  isColumnSorted(
    col:
      ColumnsConfig,
  ): boolean {

    return !!this.getSortItem(
      col,
    );
  }

  /**
   * La posición dentro de
   * `sorts` define la prioridad.
   *
   * Ejemplo:
   *
   * [
   *   date ASC,   -> 1
   *   amount DESC -> 2
   * ]
   */
  getSortPriority(
    col:
      ColumnsConfig,
  ):
    number |
    null {

    if (
      !this.isSortableColumn(
        col,
      )
    ) {
      return null;
    }

    const sortKey =
      this.getSortKey(
        col,
      );

    const index =
      (
        this.sorts ||
        []
      ).findIndex(
        (
          sort,
        ) =>
          sort.key ===
          sortKey,
      );

    return (
      index >= 0
        ? index + 1
        : null
    );
  }

  getSortIcon(
    col:
      ColumnsConfig,
  ): string {

    const sort =
      this.getSortItem(
        col,
      );

    if (!sort) {
      return 'unfold_more';
    }

    return (
      sort.direction ===
      'asc'
        ? 'arrow_upward'
        : 'arrow_downward'
    );
  }

  getSortTooltip(
    col:
      ColumnsConfig,
  ): string {

    const sort =
      this.getSortItem(
        col,
      );

    if (!sort) {
      return (
        `Ordenar ${col.label} ` +
        'ascendente'
      );
    }

    return (
      sort.direction ===
      'asc'
        ? (
            `Ordenar ${col.label} ` +
            'descendente'
          )
        : (
            `Ordenar ${col.label} ` +
            'ascendente'
          )
    );
  }

  /**
   * Click sobre una columna:
   *
   * Sin ordenar -> ASC
   * ASC -> DESC
   * DESC -> ASC
   *
   * La eliminación se realiza
   * exclusivamente mediante X.
   */
  onSortColumn(
    col:
      ColumnsConfig,

    event?:
      Event,
  ): void {

    event?.stopPropagation();

    if (
      !this.isSortableColumn(
        col,
      )
    ) {
      return;
    }

    const sortKey =
      this.getSortKey(
        col,
      );

    const currentSorts:
      DataTableSortItem[] = [
        ...(this.sorts || []),
      ];

    const currentIndex =
      currentSorts
        .findIndex(
          (
            sort,
          ) =>
            sort.key ===
            sortKey,
        );

    /*
     * Todavía no existe:
     * se agrega al final
     * con ASC.
     *
     * Su posición en el array
     * define su prioridad.
     */
    if (
      currentIndex === -1
    ) {

      this.sortChange.emit({
        sorts: [
          ...currentSorts,

          {
            key:
              sortKey,

            direction:
              'asc',
          },
        ],
      });

      return;
    }

    const currentSort =
      currentSorts[
        currentIndex
      ];

    const nextDirection:
      DataTableSortDirection =
      currentSort.direction ===
      'asc'
        ? 'desc'
        : 'asc';

    /*
     * Cambiar ASC/DESC
     * NO cambia la prioridad.
     */
    const nextSorts =
      currentSorts.map(
        (
          sort,
          index,
        ) =>
          index ===
          currentIndex
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

  /**
   * Elimina únicamente el
   * criterio seleccionado.
   *
   * Las prioridades restantes
   * se recorren automáticamente.
   */
  clearSortColumn(
    col:
      ColumnsConfig,

    event?:
      Event,
  ): void {

    event?.preventDefault();
    event?.stopPropagation();

    if (
      !this.isSortableColumn(
        col,
      )
    ) {
      return;
    }

    const sortKey =
      this.getSortKey(
        col,
      );

    const nextSorts =
      (
        this.sorts ||
        []
      ).filter(
        (
          sort,
        ) =>
          sort.key !==
          sortKey,
      );

    this.sortChange.emit({
      sorts:
        nextSorts,
    });
  }

  // ==========================
  // ACCIONES DE FILA
  // ==========================

  onRowAction(
    type:
      DataTableActionType,

    row:
      T,
  ): void {

    this.action.emit({
      type,
      row,
    });
  }

  // ==========================
  // EXPANSIÓN DE FILA
  // ==========================

  toggleRow(
    row:
      T,

    event?:
      Event,
  ): void {

    event?.stopPropagation();

    if (
      !this.expandable ||
      !this.canExpandRow(
        row,
      )
    ) {
      return;
    }

    const rowKey =
      this.getRowKey(
        row,
      );

    const expanded =
      this.expandedRowKey !==
      rowKey;

    this.expandedRowKey =
      expanded
        ? rowKey
        : null;

    this.rowExpansionChange.emit({
      row,
      expanded,
    });
  }

  collapseExpandedRow():
    void {

    this.expandedRowKey =
      null;
  }

  isRowExpanded(
    row:
      T,
  ): boolean {

    return (
      this.expandable &&
      this.expandedRowKey !==
        null &&
      this.expandedRowKey ===
        this.getRowKey(
          row,
        )
    );
  }

  canExpandRow(
    row:
      T,
  ): boolean {

    return this.canExpand
      ? this.canExpand(
          row,
        )
      : true;
  }

  getExpandTooltip(
    row:
      T,
  ): string {

    if (
      this.expandTooltip
    ) {

      if (
        typeof
          this.expandTooltip ===
        'function'
      ) {
        return (
          this.expandTooltip(
            row,
          ) ??
          ''
        );
      }

      return (
        this.expandTooltip
      );
    }

    return (
      this.isRowExpanded(
        row,
      )
        ? 'Ocultar detalle'
        : 'Ver detalle'
    );
  }

  getExpandedRowContext(
    row:
      T,
  ):
    DataTableExpandedRowContext<T> {

    return {
      $implicit:
        row,

      row,
    };
  }

  // ==========================
  // ROLES / PERMISOS
  // ==========================

  get editRolesEffective():
    RoleCode[] |
    undefined {

    return (
      this.actionPermissions
        ?.editRoles
    );
  }

  get deleteRolesEffective():
    RoleCode[] |
    undefined {

    return (
      this.actionPermissions
        ?.deleteRoles ??
      this.DEFAULT_DELETE_ROLES
    );
  }

  canShow(
    roles?:
      RoleCode[],
  ): boolean {

    if (
      !roles?.length
    ) {
      return true;
    }

    return (
      this.permissionsService
        .hasAnyRole(
          roles,
        )
    );
  }

  // ==========================
  // EXTRA ACTIONS
  // ==========================

  isExtraActionVisible(
    action:
      DataTableExtraAction<T>,

    row:
      T,
  ): boolean {

    return (
      action.visible
        ? action.visible(
            row,
          )
        : true
    );
  }

  isExtraActionDisabled(
    action:
      DataTableExtraAction<T>,

    row:
      T,
  ): boolean {

    return (
      action.disabled
        ? action.disabled(
            row,
          )
        : false
    );
  }

  getExtraActionTooltip(
    action:
      DataTableExtraAction<T>,

    row:
      T,
  ): string {

    if (
      !action.tooltip
    ) {
      return '';
    }

    if (
      typeof
        action.tooltip ===
      'function'
    ) {
      return (
        action.tooltip(
          row,
        ) ??
        ''
      );
    }

    return action.tooltip;
  }

  getExtraActionPopover(
    action:
      DataTableExtraAction<T>,

    row:
      T,
  ) {

    if (
      !action.popoverContent
    ) {
      return null;
    }

    return (
      action.popoverContent(
        row,
      )
    );
  }

  getExtraActionIconClass(
    action:
      DataTableExtraAction<T>,

    row:
      T,
  ): string {

    if (
      !action.iconClass
    ) {
      return '';
    }

    if (
      typeof
        action.iconClass ===
      'function'
    ) {
      return (
        action.iconClass(
          row,
        ) ??
        ''
      );
    }

    return (
      action.iconClass
    );
  }

  // ==========================
  // COLUMNAS
  // ==========================

  getColumnVariant(
    col:
      ColumnsConfig,

    row:
      T,
  ):
    ColumnVariant |
    undefined {

    const resolved =
      col.variantResolver
        ? col.variantResolver(
            row,
          )
        : null;

    return (
      resolved ??
      col.typeVariant ??
      undefined
    );
  }

  getColumnPopover(
    col:
      ColumnsConfig,

    row:
      T,
  ) {

    if (
      !col.popoverContent
    ) {
      return null;
    }

    return (
      col.popoverContent(
        row,
      )
    );
  }

  // ==========================
  // RELACIONES
  // ==========================

  getRelationValue(
    value:
      any,

    path?:
      string,
  ) {

    if (!value) {
      return null;
    }

    if (!path) {
      return (
        value['name'] ??
        null
      );
    }

    return (
      value[path] ??
      null
    );
  }

  // ==========================
  // VALORES VACÍOS
  // ==========================

  isEmptyValue(
    value:
      any,
  ): boolean {

    if (
      value === null ||
      value === undefined
    ) {
      return true;
    }

    if (
      typeof value ===
        'string' &&
      value.trim() ===
        ''
    ) {
      return true;
    }

    return false;
  }

  getEmptyLabel(
    fallback?:
      string | null,
  ): string {

    return (
      fallback &&
      fallback
        .trim()
        .length > 0
    )
      ? fallback
      : this.emptyLabel;
  }

  // ==========================
  // TELÉFONO
  // ==========================

  formatPhoneCell(
    value:
      any,
  ): string {

    if (
      value == null
    ) {
      return '';
    }

    const raw =
      String(value)
        .trim();

    if (!raw) {
      return '';
    }

    let country =
      '';

    let rest =
      raw;

    if (
      raw.startsWith(
        '+52',
      )
    ) {
      country =
        '+52';

      rest =
        raw.slice(3);

    } else if (
      raw.startsWith(
        '+',
      )
    ) {
      country =
        raw.slice(
          0,
          3,
        );

      rest =
        raw.slice(
          country.length,
        );
    }

    const digits =
      rest.replace(
        /\D/g,
        '',
      );

    if (!digits) {
      return (
        country ||
        raw
      );
    }

    if (
      digits.length <=
      3
    ) {
      return (
        `${country} ${digits}`
          .trim()
      );
    }

    if (
      digits.length <=
      6
    ) {
      return (
        `${country} ` +
        `${digits.slice(
          0,
          3,
        )} ` +
        `${digits.slice(
          3,
        )}`
      ).trim();
    }

    return (
      `${country} ` +
      `${digits.slice(
        0,
        3,
      )} ` +
      `${digits.slice(
        3,
        6,
      )} ` +
      `${digits.slice(
        6,
      )}`
    ).trim();
  }

  // ==========================
  // ACCIONES BASE
  // ==========================

  get showEditEffective():
    boolean {

    return (
      this.actionPermissions
        ?.showEdit ??
      true
    );
  }

  get showDeleteEffective():
    boolean {

    return (
      this.actionPermissions
        ?.showDelete ??
      true
    );
  }

  // ==========================
  // SELECT
  // ==========================

  isRowSelected(
    col:
      ColumnsConfig,

    row:
      T,
  ): boolean {

    return (
      col.selectedResolver
        ? col.selectedResolver(
            row,
          )
        : false
    );
  }

  isSelectDisabled(
    col:
      ColumnsConfig,

    row:
      T,
  ): boolean {

    return (
      col
        .selectDisabledResolver
        ? col
            .selectDisabledResolver(
              row,
            )
        : false
    );
  }

  getSelectTooltip(
    col:
      ColumnsConfig,

    row:
      T,
  ): string {

    if (
      !col.selectTooltip
    ) {
      return '';
    }

    if (
      typeof
        col.selectTooltip ===
      'function'
    ) {
      return (
        col.selectTooltip(
          row,
        ) ??
        ''
      );
    }

    return (
      col.selectTooltip
    );
  }

  onSelectColumn(
    col:
      ColumnsConfig,

    row:
      T,
  ): void {

    this.onRowAction(
      col.selectActionType ||
        'select',
      row,
    );
  }

  // ==========================
  // RENDERED COLUMNS
  // ==========================

  private updateRenderedColumns():
    void {

    const baseColumns =
      (
        this.displayedColumns ||
        []
      ).filter(
        (
          column,
        ) =>
          column !==
            'expand' &&
          column !==
            'expandedDetail',
      );

    this.renderedColumns =
      this.expandable
        ? [
            'expand',
            ...baseColumns,
          ]
        : baseColumns;
  }

  private keepValidExpandedRow():
    void {

    if (
      this.expandedRowKey ===
      null
    ) {
      return;
    }

    const expandedRowStillExists =
      (
        this.data ||
        []
      ).some(
        (
          row,
        ) =>
          this.getRowKey(
            row,
          ) ===
          this.expandedRowKey,
      );

    if (
      !expandedRowStillExists
    ) {
      this.expandedRowKey =
        null;
    }
  }

  private getRowKey(
    row:
      T,
  ):
    DataTableRowKey {

    return (
      this.rowKeyResolver(
        row,
      )
    );
  }
}