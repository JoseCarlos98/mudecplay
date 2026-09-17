import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  finalize,
  forkJoin,
} from 'rxjs';

import {
  MatIconModule,
} from '@angular/material/icon';

import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';

import * as entity
  from './interfaces/expense-classifications.interfaces';

import {
  ExpenseClassificationsService,
} from './services/expense-classifications.service';

import {
  ModuleHeaderConfig,
} from '../../shared/ui/module-header/interfaces/module-header-interface';

import {
  Catalog,
} from '../../shared/interfaces/general-interfaces';

import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableExtraAction,
} from '../../shared/ui/data-table/interfaces/table-interfaces';

import {
  ModuleHeader,
} from '../../shared/ui/module-header/module-header';

import {
  DataTable,
} from '../../shared/ui/data-table/data-table';

import {
  InputField,
} from '../../shared/ui/input-field/input-field';

import {
  InputSelect,
} from '../../shared/ui/input-select/input-select';

import {
  BtnsSection,
} from '../../shared/ui/btns-section/btns-section';

import {
  LoadingOverlay,
} from '../../shared/ui/loading-overlay/loading-overlay';

import {
  toIdForm,
} from '../../shared/helpers/general-helpers';
import { DialogService } from '../../shared/services/dialog.service';
import { ModalExpenseReportClassification } from './components/modal-expense-report-classification/modal-expense-report-classification';
import { ModalReassignExpenseClassification } from './components/modal-reassign-expense-classification/modal-reassign-expense-classification';


// =========================================================
// HEADER
// =========================================================

const HEADER_CONFIG:
  ModuleHeaderConfig = {};


// =========================================================
// OPCIONES
// =========================================================

const SOURCE_TYPE_OPTIONS:
  Catalog[] = [
    {
      id: '',
      name: 'Todos',
    },
    {
      id: 'concept',
      name: 'Conceptos',
    },
    {
      id: 'product',
      name: 'Productos históricos',
    },
  ];


const STATUS_OPTIONS:
  Catalog[] = [
    {
      id: 'active',
      name: 'Activos',
    },
    {
      id: 'inactive',
      name: 'Inactivos',
    },
    {
      id: 'all',
      name: 'Todos',
    },
  ];


// =========================================================
// COLUMNAS: PENDIENTES
// =========================================================

const PENDING_COLUMNS:
  ColumnsConfig[] = [
    {
      key: 'selected',
      label: 'Elegir',
      type: 'select',
      align: 'center',

      selectActionType:
        'togglePendingSelection',

      selectedResolver: (
        row:
          entity.ExpenseClassificationPendingTableRow,
      ) =>
        row.selected === true,

      selectTooltip: (
        row:
          entity.ExpenseClassificationPendingTableRow,
      ) =>
        row.selected
          ? 'Quitar de la selección'
          : 'Seleccionar para homologar',
    },
    {
      key: 'displayName',
      label: 'Nombre',
    },
    {
      key: 'sourceTypeLabel',
      label: 'Tipo',
      type: 'chip',

      variantResolver: (
        row:
          entity.ExpenseClassificationPendingTableRow,
      ) =>
        resolveSourceTypeVariant(
          row.sourceType,
        ),
    },
    {
      key: 'itemCount',
      label: 'Usos',
      align: 'right',
    },
    {
      key: 'purchaseCount',
      label: 'Compras',
      align: 'right',
    },
  ];


const PENDING_DISPLAYED_COLUMNS =
  PENDING_COLUMNS.map(
    (column) =>
      column.key,
  );


// =========================================================
// COLUMNAS: HOMOLOGADOS
// =========================================================

const MAPPING_COLUMNS:
  ColumnsConfig[] = [
    {
      key: 'displayName',
      label: 'Concepto / Producto',
    },
    {
      key: 'sourceTypeLabel',
      label: 'Tipo',
      type: 'chip',

      variantResolver: (
        row:
          entity.ExpenseClassificationMappingTableRow,
      ) =>
        resolveSourceTypeVariant(
          row.sourceType,
        ),
    },
    {
      key: 'classificationName',
      label: 'Clasificación',
      type: 'chip',

      variantResolver: () =>
        'chip-neutral',
    },
    {
      key: 'statusLabel',
      label: 'Estado',
      type: 'chip',

      variantResolver: (
        row:
          entity.ExpenseClassificationMappingTableRow,
      ) =>
        row.isActive
          ? 'chip-success'
          : 'chip-danger',
    },
  ];


const MAPPING_DISPLAYED_COLUMNS = [
  ...MAPPING_COLUMNS.map(
    (column) =>
      column.key,
  ),
  'actions',
];


// =========================================================
// HELPERS VISUALES
// =========================================================

function resolveSourceTypeVariant(
  sourceType:
    entity.ExpenseClassificationSourceType,
): ColumnVariant {

  return sourceType === 'concept'
    ? 'chip-neutral'
    : 'chip-success';
}


// =========================================================
// COMPONENTE
// =========================================================

@Component({
  selector:
    'app-expense-classifications',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatIconModule,
    MatPaginatorModule,

    ModuleHeader,
    DataTable,
    InputField,
    InputSelect,
    BtnsSection,
    LoadingOverlay,
  ],

  templateUrl:
    './expense-classifications.html',

  styleUrl:
    './expense-classifications.scss',
})
export class ExpenseClassifications
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  private readonly service =
    inject(
      ExpenseClassificationsService,
    );

  private readonly fb =
    inject(
      FormBuilder,
    );

  private readonly dialogService =
    inject(
      DialogService,
    );

  // =========================================================
  // UI
  // =========================================================

  readonly headerConfig =
    HEADER_CONFIG;


  readonly activeTab =
    signal<
      entity.ExpenseClassificationsTab
    >(
      'pending',
    );


  readonly pendingColumns =
    PENDING_COLUMNS;

  readonly pendingDisplayedColumns =
    PENDING_DISPLAYED_COLUMNS;


  readonly mappingColumns =
    MAPPING_COLUMNS;

  readonly mappingDisplayedColumns =
    MAPPING_DISPLAYED_COLUMNS;


  readonly sourceTypeOptions =
    SOURCE_TYPE_OPTIONS;

  readonly statusOptions =
    STATUS_OPTIONS;


  readonly tableActionPermissions = {
    showEdit: false,
    showDelete: false,
  };


  // =========================================================
  // LOADING
  // =========================================================

  readonly loadingClassifications =
    signal(
      false,
    );

  readonly loadingPending =
    signal(
      false,
    );

  readonly loadingMappings =
    signal(
      false,
    );

  readonly classifyingPending =
    signal(false);

  readonly changingMappingStatus =
    signal(false);

  readonly loadingPage =
    computed(
      () =>
        this.loadingClassifications() ||
        this.loadingPending() ||
        this.loadingMappings() ||
        this.classifyingPending() ||
        this.changingMappingStatus(),
    );


  // =========================================================
  // CLASIFICACIONES
  // =========================================================

  classifications:
    entity.ExpenseReportClassification[] =
    [];


  get activeClassifications():
    entity.ExpenseReportClassification[] {

    return this.classifications.filter(
      (classification) =>
        classification.isActive,
    );
  }


  classificationOptions:
    Catalog[] = [];


  readonly selectedClassificationId =
    signal<number | null>(
      null,
    );


  get selectedClassificationName():
    string {

    const classificationId =
      this.selectedClassificationId();

    if (
      classificationId === null
    ) {
      return 'Sin seleccionar';
    }

    return (
      this.activeClassifications.find(
        (classification) =>
          classification.id ===
          classificationId,
      )?.name ??
      'Sin seleccionar'
    );
  }


  // =========================================================
  // PENDIENTES
  // =========================================================

  pendingItems:
    entity.ExpenseClassificationPendingItem[] =
    [];


  pendingRows:
    entity.ExpenseClassificationPendingTableRow[] =
    [];


  /*
   * /pending devuelve todo el conjunto filtrado.
   *
   * La paginación se realiza únicamente en frontend
   * para no modificar el DataTable compartido ni
   * cambiar el contrato actual del backend.
   */
  pendingPageIndex =
    0;

  pendingPageSize =
    10;


  get pendingVisibleRows():
    entity.ExpenseClassificationPendingTableRow[] {

    const start =
      this.pendingPageIndex *
      this.pendingPageSize;

    const end =
      start +
      this.pendingPageSize;

    return this.pendingRows.slice(
      start,
      end,
    );
  }


  readonly selectedPendingKeys =
    signal<
      Set<string>
    >(
      new Set<string>(),
    );


  readonly selectedPendingCount =
    computed(
      () =>
        this.selectedPendingKeys()
          .size,
    );


  // =========================================================
  // HOMOLOGADOS
  // =========================================================

  mappingsResponse:
    entity.ExpenseClassificationMappingsResponse =
    {
      data: [],

      meta: {
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 0,
      },
    };


  mappingRows:
    entity.ExpenseClassificationMappingTableRow[] =
    [];


  mappingFilters:
    entity.ExpenseClassificationMappingFilters =
    {
      search: '',

      sourceType:
        undefined,

      status:
        'active',

      classificationId:
        null,

      page: 1,

      limit: 25,
    };


  // =========================================================
  // FORMULARIOS
  // =========================================================

  readonly pendingFilterForm =
    this.fb.group({
      search:
        this.fb.control<string>(
          '',
          {
            nonNullable: true,
          },
        ),

      sourceType:
        this.fb.control<
          Catalog |
          string |
          null
        >(
          null,
        ),
    });


  readonly mappingFilterForm =
    this.fb.group({
      search:
        this.fb.control<string>(
          '',
          {
            nonNullable: true,
          },
        ),

      sourceType:
        this.fb.control<
          Catalog |
          string |
          null
        >(
          null,
        ),

      status:
        this.fb.control<
          Catalog |
          string |
          null
        >(
          {
            id: 'active',
            name: 'Activos',
          },
        ),

      classificationId:
        this.fb.control<
          Catalog |
          number |
          string |
          null
        >(
          null,
        ),
    });


  // =========================================================
  // ACCIONES DE HOMOLOGADOS
  // =========================================================

  readonly mappingExtraActions:
    DataTableExtraAction<
      entity.ExpenseClassificationMappingTableRow
    >[] = [
      {
        type: 'reassign',
        icon: 'edit',
        tooltip:
          'Cambiar clasificación',
      },
      {
        type: 'deactivate',
        icon: 'block',
        tooltip:
          'Desactivar homologación',

        iconClass:
          'table-action-icon--danger',

        visible: (
          row,
        ) =>
          row.isActive,
      },
      {
        type: 'reactivate',
        icon: 'restart_alt',
        tooltip:
          'Reactivar homologación',

        iconClass:
          'table-action-icon--success',

        visible: (
          row,
        ) =>
          !row.isActive,
      },
    ];


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit():
    void {

    this.loadInitialData();
  }


  // =========================================================
  // CARGA INICIAL
  // =========================================================

  private loadInitialData():
    void {

    this.loadingClassifications
      .set(
        true,
      );

    this.loadingPending
      .set(
        true,
      );

    forkJoin({
      classifications:
        this.service
          .getClassifications({
            status: 'all',
          }),

      pending:
        this.service
          .getPendingClassifications(),
    })
      .pipe(
        finalize(
          () => {

            this.loadingClassifications
              .set(
                false,
              );

            this.loadingPending
              .set(
                false,
              );
          },
        ),
      )
      .subscribe({
        next: (
          response,
        ) => {

          this.setClassifications(
            response.classifications,
          );

          this.setPendingItems(
            response.pending,
          );
        },
      });
  }


  // =========================================================
  // TABS
  // =========================================================

  setActiveTab(
    tab:
      entity.ExpenseClassificationsTab,
  ): void {

    if (
      this.activeTab() ===
      tab
    ) {
      return;
    }

    this.activeTab
      .set(
        tab,
      );

    if (
      tab ===
      'homologated'
    ) {

      this.loadMappings();
    }
  }


  // =========================================================
  // CLASIFICACIONES
  // =========================================================

  private setClassifications(
    classifications:
      entity.ExpenseReportClassification[],
  ): void {

    this.classifications =
      classifications;

    this.classificationOptions =
      classifications
        .filter(
          (item) =>
            item.isActive,
        )
        .map(
          (item) => ({
            id:
              String(
                item.id,
              ),

            name:
              item.name,
          }),
        );
  }


  // =========================================================
  // CLASIFICACIONES:
  // CREAR
  // =========================================================

  openCreateClassificationModal():
    void {

    const modalData:
      entity.ExpenseReportClassificationModalData = {
      mode:
        'create',
    };


    this.dialogService
      .open(
        ModalExpenseReportClassification,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          classification:
            | entity.ExpenseReportClassification
            | null,
        ) => {

          if (
            !classification?.id
          ) {
            return;
          }


          /*
           * Actualizamos únicamente el catálogo.
           *
           * NO recargamos pendientes para evitar
           * perder selección, búsqueda, página, etc.
           */
          const classifications =
            this.classifications
              .filter(
                (item) =>
                  item.id !==
                  classification.id,
              );


          this.setClassifications([
            ...classifications,
            classification,
          ]);


          /*
           * La clasificación recién creada
           * queda seleccionada automáticamente.
           *
           * Esto permite:
           *
           * 1. seleccionar conceptos
           * 2. crear categoría
           * 3. regresar del modal
           * 4. homologar inmediatamente
           */
          this.selectedClassificationId
            .set(
              classification.id,
            );
        },
      );
  }

  // =========================================================
  // PENDIENTES:
  // TRANSFORMACIÓN
  // =========================================================

  private setPendingItems(
    items:
      entity.ExpenseClassificationPendingItem[],
  ): void {

    this.pendingItems =
      items;

    /*
     * Una nueva búsqueda/filtro siempre vuelve
     * a la primera página.
     */
    this.pendingPageIndex =
      0;

    const selected =
      this.selectedPendingKeys();

    this.pendingRows =
      items.map(
        (
          item,
        ) => {

          const id =
            this.getPendingKey(
              item,
            );

          return {
            ...item,

            id,

            sourceTypeLabel:
              item.sourceType ===
                'concept'
                ? 'Concepto'
                : 'Producto histórico',

            selected:
              selected.has(
                id,
              ),
          };
        },
      );
  }


  private getPendingKey(
    item:
      entity.ExpenseClassificationPendingItem,
  ): string {

    if (
      item.sourceType ===
      'concept'
    ) {

      return (
        `concept:${item.normalizedConcept}`
      );
    }

    return (
      `product:${item.productId}`
    );
  }


  // =========================================================
  // PENDIENTES:
  // SELECCIÓN
  // =========================================================

  onPendingTableAction(
    event:
      DataTableActionEvent<
        entity.ExpenseClassificationPendingTableRow
      >,
  ): void {

    if (
      event.type !==
      'togglePendingSelection'
    ) {
      return;
    }

    this.togglePendingSelection(
      event.row,
    );
  }


  private togglePendingSelection(
    row:
      entity.ExpenseClassificationPendingTableRow,
  ): void {

    const next =
      new Set(
        this.selectedPendingKeys(),
      );

    if (
      next.has(
        row.id,
      )
    ) {

      next.delete(
        row.id,
      );

    } else {

      next.add(
        row.id,
      );
    }

    this.selectedPendingKeys
      .set(
        next,
      );

    this.syncPendingSelection();
  }


  /*
   * IMPORTANTE:
   *
   * Selecciona todos los registros del conjunto
   * actualmente filtrado, no solamente la página
   * que está visible.
   */
  selectAllPendingResults():
    void {

    const next =
      new Set(
        this.selectedPendingKeys(),
      );

    for (
      const row of
      this.pendingRows
    ) {

      next.add(
        row.id,
      );
    }

    this.selectedPendingKeys
      .set(
        next,
      );

    this.syncPendingSelection();
  }


  clearPendingSelection():
    void {

    this.selectedPendingKeys
      .set(
        new Set<string>(),
      );

    this.syncPendingSelection();
  }


  private syncPendingSelection():
    void {

    const selected =
      this.selectedPendingKeys();

    this.pendingRows =
      this.pendingRows.map(
        (
          row,
        ) => ({
          ...row,

          selected:
            selected.has(
              row.id,
            ),
        }),
      );
  }


  // =========================================================
  // PENDIENTES:
  // PAGINACIÓN LOCAL
  // =========================================================

  onPendingPageChange(
    event:
      PageEvent,
  ): void {

    this.pendingPageIndex =
      event.pageIndex;

    this.pendingPageSize =
      event.pageSize;
  }


  // =========================================================
  // PENDIENTES:
  // FILTROS
  // =========================================================

  applyPendingFilters():
    void {

    const form =
      this.pendingFilterForm
        .getRawValue();

    const sourceType =
      this.resolveSourceType(
        form.sourceType,
      );

    this.loadPending({
      search:
        form.search.trim(),

      sourceType,
    });
  }


  clearPendingFilters():
    void {

    this.pendingFilterForm
      .reset({
        search: '',

        sourceType:
          null,
      });

    this.loadPending();
  }


  private loadPending(
    filters:
      entity.ExpenseClassificationPendingFilters =
      {},
  ): void {

    this.loadingPending
      .set(
        true,
      );

    this.service
      .getPendingClassifications(
        filters,
      )
      .pipe(
        finalize(
          () =>
            this.loadingPending
              .set(
                false,
              ),
        ),
      )
      .subscribe({
        next: (
          items,
        ) => {

          this.setPendingItems(
            items,
          );
        },
      });
  }


  // =========================================================
  // HOMOLOGADOS:
  // CARGA
  // =========================================================

  private loadMappings():
    void {

    this.loadingMappings
      .set(
        true,
      );

    this.service
      .getMappings(
        this.mappingFilters,
      )
      .pipe(
        finalize(
          () =>
            this.loadingMappings
              .set(
                false,
              ),
        ),
      )
      .subscribe({
        next: (
          response,
        ) => {

          this.mappingsResponse =
            response;

          this.mappingRows =
            response.data.map(
              (
                item,
              ) => ({
                ...item,

                id:
                  `${item.sourceType}:${item.mappingId}`,

                sourceTypeLabel:
                  item.sourceType ===
                    'concept'
                    ? 'Concepto'
                    : 'Producto histórico',

                classificationName:
                  item.classification.name,

                statusLabel:
                  item.isActive
                    ? 'Activo'
                    : 'Inactivo',
              }),
            );
        },
      });
  }


  // =========================================================
  // HOMOLOGADOS:
  // FILTROS
  // =========================================================

  applyMappingFilters():
    void {

    const form =
      this.mappingFilterForm
        .getRawValue();

    this.mappingFilters = {
      ...this.mappingFilters,

      search:
        form.search.trim(),

      sourceType:
        this.resolveSourceType(
          form.sourceType,
        ),

      status:
        this.resolveStatus(
          form.status,
        ),

      classificationId:
        toIdForm(
          form.classificationId,
        ),

      page: 1,
    };

    this.loadMappings();
  }


  clearMappingFilters():
    void {

    this.mappingFilterForm
      .reset({
        search: '',

        sourceType:
          null,

        status: {
          id: 'active',
          name: 'Activos',
        },

        classificationId:
          null,
      });

    this.mappingFilters = {
      search: '',

      sourceType:
        undefined,

      status:
        'active',

      classificationId:
        null,

      page: 1,

      limit:
        this.mappingFilters
          .limit,
    };

    this.loadMappings();
  }


  // =========================================================
  // HOMOLOGADOS:
  // PAGINACIÓN
  // =========================================================

  onMappingPageChange(
    event:
      PageEvent,
  ): void {

    this.mappingFilters = {
      ...this.mappingFilters,

      page:
        event.pageIndex + 1,

      limit:
        event.pageSize,
    };

    this.loadMappings();
  }


  // =========================================================
  // HOMOLOGADOS:
  // ACCIONES
  // =========================================================

  onMappingTableAction(
    event:
      DataTableActionEvent<
        entity.ExpenseClassificationMappingTableRow
      >,
  ): void {

    switch (
    event.type
    ) {

      case 'reassign':

        this.openReassignMappingModal(
          event.row,
        );

        break;


      case 'deactivate':

        this.confirmDeactivateMapping(
          event.row,
        );

        break;


      case 'reactivate':
        break;
    }
  }


  // =========================================================
  // HOMOLOGADOS:
  // DESACTIVAR
  // =========================================================

  private confirmDeactivateMapping(
    mapping:
      entity.ExpenseClassificationMappingTableRow,
  ): void {

    if (
      this.changingMappingStatus()
    ) {
      return;
    }


    this.dialogService
      .confirm({
        title:
          'Desactivar homologación',

        message:
          `¿Deseas desactivar la homologación de "${mapping.displayName}"? ` +
          `Dejará de clasificarse como "${mapping.classification.name}" ` +
          `y volverá a aparecer entre los pendientes por homologar.`,

        confirmText:
          'Desactivar',

        cancelText:
          'Cancelar',
      })
      .subscribe(
        (
          confirmed:
            boolean,
        ) => {

          if (
            !confirmed
          ) {
            return;
          }


          this.deactivateMapping(
            mapping,
          );
        },
      );
  }


  // =========================================================
  // HOMOLOGADOS:
  // EJECUTAR DESACTIVACIÓN
  // =========================================================

  private deactivateMapping(
    mapping:
      entity.ExpenseClassificationMappingTableRow,
  ): void {

    const payload:
      entity.ChangeExpenseClassificationMappingStatusPayload = {

      sourceType:
        mapping.sourceType,

      mappingId:
        mapping.mappingId,
    };


    this.changingMappingStatus
      .set(
        true,
      );


    this.service
      .deactivateMapping(
        payload,
      )
      .pipe(
        finalize(
          () =>
            this.changingMappingStatus
              .set(
                false,
              ),
        ),
      )
      .subscribe({
        next: () => {

          /*
           * Si llegamos aquí, el PATCH respondió
           * correctamente.
           *
           * Recargamos homologados porque la vista
           * actual muestra únicamente activos.
           */
          this.loadMappings();


          /*
           * La homologación desactivada vuelve
           * a quedar disponible en Pendientes.
           */
          this.reloadCurrentPendingResults();
        },

        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error desactivando homologación:',
            error,
          );
        },
      });
  }

  // =========================================================
  // HOMOLOGADOS:
  // REASIGNAR
  // =========================================================

  private openReassignMappingModal(
    mapping:
      entity.ExpenseClassificationMappingTableRow,
  ): void {

    const classifications =
      this.classifications
        .filter(
          (
            classification,
          ) =>
            classification.isActive,
        );


    if (
      classifications.length <= 1
    ) {
      return;
    }


    const modalData:
      entity.ReassignExpenseClassificationModalData = {

      mapping,

      classifications,
    };


    this.dialogService
      .open(
        ModalReassignExpenseClassification,
        modalData,
        'medium',
      )
      .afterClosed()
      .subscribe(
        (
          changed:
            boolean |
            null,
        ) => {

          if (
            !changed
          ) {
            return;
          }


          /*
           * Reconsultamos porque si hay filtros
           * por clasificación, la fila podría
           * incluso dejar de pertenecer a la vista.
           */
          this.loadMappings();
        },
      );
  }

  private resolveSourceType(
    value:
      Catalog |
      string |
      null,
  ):
    entity.ExpenseClassificationSourceType |
    undefined {

    const raw =
      typeof value ===
        'object'
        ? value?.id
        : value;

    if (
      raw === 'concept' ||
      raw === 'product'
    ) {

      return raw;
    }

    return undefined;
  }


  private resolveStatus(
    value:
      Catalog |
      string |
      null,
  ):
    entity.ExpenseClassificationStatusFilter {

    const raw =
      typeof value ===
        'object'
        ? value?.id
        : value;

    if (
      raw === 'inactive' ||
      raw === 'all'
    ) {

      return raw;
    }

    return 'active';
  }


  // =========================================================
  // ESTADO DE FILTROS
  // =========================================================

  get hasActivePendingFilters():
    boolean {

    const value =
      this.pendingFilterForm
        .getRawValue();

    return Boolean(
      value.search.trim() ||
      this.resolveSourceType(
        value.sourceType,
      ),
    );
  }


  get hasActiveMappingFilters():
    boolean {

    const value =
      this.mappingFilterForm
        .getRawValue();

    return Boolean(
      value.search.trim() ||
      this.resolveSourceType(
        value.sourceType,
      ) ||
      this.resolveStatus(
        value.status,
      ) !== 'active' ||
      toIdForm(
        value.classificationId,
      ),
    );
  }


  // =========================================================
  // BTN SECTIONS
  // =========================================================

  onPendingBtnsSectionAction(
    action:
      string,
  ): void {

    switch (
    action
    ) {

      case 'search':
        this.applyPendingFilters();
        break;

      case 'clean':
        this.clearPendingFilters();
        break;
    }
  }


  onMappingBtnsSectionAction(
    action:
      string,
  ): void {

    switch (
    action
    ) {

      case 'search':
        this.applyMappingFilters();
        break;

      case 'clean':
        this.clearMappingFilters();
        break;
    }
  }

  // =========================================================
  // PENDIENTES:
  // HOMOLOGAR SELECCIONADOS
  // =========================================================

  classifySelectedPending():
    void {

    if (
      this.classifyingPending()
    ) {
      return;
    }


    const classificationId =
      this.selectedClassificationId();


    if (
      !classificationId
    ) {
      return;
    }


    const selectedKeys =
      this.selectedPendingKeys();


    if (
      selectedKeys.size === 0
    ) {
      return;
    }


    /*
     * Recuperamos únicamente las filas
     * seleccionadas de los resultados actuales.
     */
    const selectedRows =
      this.pendingRows
        .filter(
          (row) =>
            selectedKeys.has(
              row.id,
            ),
        );


    if (
      selectedRows.length === 0
    ) {
      return;
    }


    /*
     * Convertimos cada pendiente al contrato
     * que espera POST /classify.
     *
     * CONCEPTO:
     * {
     *   sourceType: 'concept',
     *   conceptName: 'gasolina magna'
     * }
     *
     * PRODUCTO HISTÓRICO:
     * {
     *   sourceType: 'product',
     *   productId: 123
     * }
     */
    const items:
      entity.ExpenseClassificationSelection[] =
      selectedRows
        .map(
          (
            row,
          ):
            entity.ExpenseClassificationSelection => {

            if (
              row.sourceType ===
              'concept'
            ) {

              return {
                sourceType:
                  'concept',

                conceptName:
                  row.normalizedConcept,
              };
            }


            return {
              sourceType:
                'product',

              productId:
                row.productId,
            };
          },
        );


    const payload:
      entity.BulkClassifyExpensePendingPayload = {

      classificationId,

      items,
    };


    this.classifyingPending
      .set(
        true,
      );


    this.service
      .classifyPending(
        payload,
      )
      .pipe(
        finalize(
          () =>
            this.classifyingPending
              .set(
                false,
              ),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.BulkClassifyExpensePendingResponse,
        ) => {

          if (
            !response?.success
          ) {
            return;
          }


          /*
           * Ya fueron homologados.
           * La selección anterior deja de tener sentido.
           */
          this.clearPendingSelection();


          /*
           * Importante:
           *
           * NO limpiamos selectedClassificationId.
           *
           * Así GASOLINA sigue seleccionada y el usuario
           * puede continuar homologando otro grupo
           * hacia la misma clasificación.
           */


          /*
           * Volvemos a consultar pendientes
           * respetando los filtros actualmente visibles.
           *
           * Los recién homologados deben desaparecer
           * porque backend ya los considera clasificados.
           */
          this.reloadCurrentPendingResults();
        },

        error: (
          error:
            unknown,
        ) => {

          console.error(
            'Error homologando conceptos de gasto:',
            error,
          );
        },
      });
  }


  // =========================================================
  // PENDIENTES:
  // RECARGAR FILTRO ACTUAL
  // =========================================================

  private reloadCurrentPendingResults():
    void {

    const form =
      this.pendingFilterForm
        .getRawValue();


    this.loadPending({
      search:
        form.search
          .trim(),

      sourceType:
        this.resolveSourceType(
          form.sourceType,
        ),
    });
  }
}