import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
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
  catchError,
  debounceTime,
  EMPTY,
  filter,
  finalize,
  merge,
  Subject,
  tap,
} from 'rxjs';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  MatIconModule,
} from '@angular/material/icon';

import {
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';


// ============================================================
// REPORTES
// ============================================================

import * as entity
  from '../../interfaces/reports-interfaces';

import {
  ExpenseAnalysisService,
} from '../../services/expense-analysis.service';

import {
  ExpenseClassificationsService,
} from '../../../expense-classifications/services/expense-classifications.service';

import {
  Catalog,
} from '../../../../shared/interfaces/general-interfaces';

import {
  ColumnsConfig,
  ColumnVariant,
} from '../../../../shared/ui/data-table/interfaces/table-interfaces';

import {
  DateRangeValue,
  InputDate,
} from '../../../../shared/ui/input-date/input-date';

import {
  InputField,
} from '../../../../shared/ui/input-field/input-field';

import {
  InputSelect,
} from '../../../../shared/ui/input-select/input-select';

import {
  Autocomplete,
} from '../../../../shared/ui/autocomplete/autocomplete';

import {
  DataTable,
} from '../../../../shared/ui/data-table/data-table';

import {
  LoadingOverlay,
} from '../../../../shared/ui/loading-overlay/loading-overlay';

import {
  toApiDate,
  toIdForm,
} from '../../../../shared/helpers/general-helpers';


// ============================================================
// OPCIONES
// ============================================================

const CLASSIFICATION_STATE_OPTIONS:
  Catalog[] = [
    {
      id: '',
      name: 'Todos',
    },
    {
      id: 'classified',
      name: 'Clasificados',
    },
    {
      id: 'unclassified',
      name: 'Sin clasificar',
    },
  ];

const GROUP_STATE_OPTIONS:
  Catalog[] = [
    {
      id: '',
      name: 'Todos',
    },
    {
      id: 'assigned',
      name: 'Asignados',
    },
    {
      id: 'unassigned',
      name: 'Sin asignar',
    },
  ];

const ORIGIN_OPTIONS:
  Catalog[] = [
    {
      id: '',
      name: 'Todos',
    },
    {
      id: 'direct',
      name: 'Gasto directo',
    },
    {
      id: 'warehouse',
      name: 'Almacén',
    },
    {
      id: 'purchase_order',
      name: 'Orden de compra',
    },
    {
      id: 'labor',
      name: 'Mano de obra',
    },
  ];

const EXTRA_WORK_OPTIONS:
  Catalog[] = [
    {
      id: '',
      name: 'Todos',
    },
    {
      id: 'true',
      name: 'Sí',
    },
    {
      id: 'false',
      name: 'No',
    },
  ];


// ============================================================
// TABLA DETALLE
// ============================================================

type ExpenseAnalysisDetailTableRow =
  entity.ExpenseAnalysisRow & {
    groupDisplayName: string;
    sourceDisplayName: string;
    extraDisplayName: string;
  };

const DETAIL_COLUMNS:
  ColumnsConfig[] = [
    {
      key: 'date',
      label: 'Fecha',
      type: 'date',
    },
    {
      key: 'projectName',
      label: 'Proyecto',
    },
    {
      key: 'supplierName',
      label: 'Proveedor',
    },
    {
      key: 'classificationName',
      label: 'Clasificación',
    },
    {
      key: 'groupDisplayName',
      label: 'Sobrenombre',
    },
    {
      key: 'registeredName',
      label: 'Nombre registrado',
    },
    {
      key: 'sourceDisplayName',
      label: 'Origen',
      type: 'chip',
      variantResolver:
        (
          row:
            ExpenseAnalysisDetailTableRow,
        ): ColumnVariant => {

          switch (
            row.source
          ) {

            case 'purchase_order':

              return 'chip-warning';

            case 'labor':

              return 'chip-success';

            default:

              return 'chip-neutral';
          }
        },
    },
    {
      key: 'folio',
      label: 'Folio',
    },
    {
      key: 'expenseAmount',
      label: 'Importe',
      type: 'money',
      align: 'right',
    },
    {
      key: 'paidAmount',
      label: 'Pagado',
      type: 'money',
      align: 'right',
    },
    {
      key: 'cxpBalance',
      label: 'Saldo CxP',
      type: 'money',
      align: 'right',
    },
    {
      key: 'purchaseOrderCommitment',
      label: 'Compromiso O.C.',
      type: 'money',
      align: 'right',
    },
    {
      key: 'extraDisplayName',
      label: 'Extra',
      type: 'chip',
      variantResolver:
        (
          row:
            ExpenseAnalysisDetailTableRow,
        ): ColumnVariant =>
          row.isExtraWork
            ? 'chip-warning'
            : 'chip-neutral',
    },
  ];

const DETAIL_DISPLAYED_COLUMNS =
  DETAIL_COLUMNS.map(
    (
      column,
    ) =>
      column.key,
  );


// ============================================================
// TIPOS LOCALES
// ============================================================

type ExpenseAnalysisTab =
  | 'summary'
  | 'detail';

interface BreakdownVisibleRow {
  node:
    entity.ExpenseAnalysisBreakdownNode;

  depth:
    number;
}

interface ExpenseAnalysisGroupCatalogItem {
  id:
    number;

  name:
    string;

  classificationId:
    number;
}

const EXPENSE_ANALYSIS_STATE_KEY =
  'mudecplay.reports.expense-analysis.state.v1';

type ExpenseAnalysisAutocompleteControl =
  | 'projectId'
  | 'supplierId'
  | 'productId';

interface ExpenseAnalysisStoredFilters {
  dateRange:
    DateRangeValue | null;

  projectId:
    Catalog | null;

  supplierId:
    Catalog | null;

  productId:
    Catalog | null;

  classificationId:
    Catalog
    | number
    | string
    | null;

  classificationState:
    entity.ExpenseAnalysisClassificationState
    | '';

  groupId:
    Catalog
    | number
    | string
    | null;

  groupState:
    entity.ExpenseAnalysisGroupState
    | '';

  registeredName:
    string | null;

  amountMin:
    number
    | string
    | null;

  amountMax:
    number
    | string
    | null;

  origin:
    entity.ExpenseAnalysisOrigin
    | '';

  isExtraWork:
    'true'
    | 'false'
    | '';

  search:
    string | null;
}

interface ExpenseAnalysisStoredState {
  filters:
    ExpenseAnalysisStoredFilters;

  activeTab:
    ExpenseAnalysisTab;

  page:
    number;

  limit:
    number;
}


// ============================================================
// COMPONENTE
// ============================================================

@Component({
  selector:
    'app-expense-analysis',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatIconModule,
    MatPaginatorModule,

    InputDate,
    InputField,
    InputSelect,
    Autocomplete,
    DataTable,
    LoadingOverlay,
  ],

  templateUrl:
    './expense-analysis.html',

  styleUrl:
    './expense-analysis.scss',
})
export class ExpenseAnalysis
  implements OnInit {

  // ==========================================================
  // INYECCIONES
  // ==========================================================

  private readonly expenseClassificationsService =
    inject(
      ExpenseClassificationsService,
    );

  private readonly service =
    inject(
      ExpenseAnalysisService,
    );

  private readonly fb =
    inject(
      FormBuilder,
    );

  private readonly destroyRef =
    inject(
      DestroyRef,
    );


  // ==========================================================
  // CONFIGURACIÓN
  // ==========================================================

  readonly classificationStateOptions =
    CLASSIFICATION_STATE_OPTIONS;

  readonly groupStateOptions =
    GROUP_STATE_OPTIONS;

  readonly originOptions =
    ORIGIN_OPTIONS;

  readonly extraWorkOptions =
    EXTRA_WORK_OPTIONS;

  readonly detailColumns =
    DETAIL_COLUMNS;

  readonly detailDisplayedColumns =
    DETAIL_DISPLAYED_COLUMNS;

  readonly tableActionPermissions = {
    showEdit:
      false,

    showDelete:
      false,
  };


  // ==========================================================
  // UI
  // ==========================================================

  readonly activeTab =
    signal<
      ExpenseAnalysisTab
    >(
      'summary',
    );

  readonly loading =
    signal(
      false,
    );

  readonly exporting =
    signal(
      false,
    );

  readonly breakdownSearch =
    signal(
      '',
    );


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  readonly page =
    signal(
      1,
    );

  readonly limit =
    signal(
      10,
    );


  // ==========================================================
  // DATA
  // ==========================================================

  readonly response =
    signal<
      entity.ExpenseAnalysisResponse
      | null
    >(
      null,
    );

  readonly summary =
    computed(
      () => {

        return (
          this.response()
            ?.summary ??
          {
            expenseAmount:
              0,

            paidAmount:
              0,

            cxpBalance:
              0,

            purchaseOrderCommitment:
              0,
          }
        );
      },
    );

  readonly breakdown =
    computed(
      () =>
        this.response()
          ?.breakdown ??
        [],
    );

  readonly detailRows =
    computed<
      ExpenseAnalysisDetailTableRow[]
    >(
      () => {

        return (
          this.response()
            ?.rows ??
          []
        )
          .map(
            (
              row,
            ) =>
              this.mapDetailRow(
                row,
              ),
          );
      },
    );

  readonly pagination =
    computed(
      () => {

        return (
          this.response()
            ?.pagination ??
          {
            page:
              1,

            limit:
              this.limit(),

            total:
              0,

            totalPages:
              0,
          }
        );
      },
    );

  readonly classificationCount =
    computed(
      () =>
        this.breakdown()
          .filter(
            (
              item,
            ) =>
              item.level ===
              'classification',
          )
          .length,
    );


  // ==========================================================
  // CATÁLOGOS DE REPORTE
  // ==========================================================

  readonly classificationOptions =
    signal<
      Catalog[]
    >(
      [],
    );

  readonly groupCatalog =
    signal<
      ExpenseAnalysisGroupCatalogItem[]
    >(
      [],
    );

  readonly groupOptions =
    computed<
      Catalog[]
    >(
      () => {

        const classificationId =
          this.getNumberId(
            this.filtersForm
              .get(
                'classificationId',
              )
              ?.value,
          );

        return this
          .groupCatalog()
          .filter(
            (
              group,
            ) =>
              !classificationId ||
              group.classificationId ===
              classificationId,
          )
          .map(
            (
              group,
            ) => ({
              id:
                group.id,

              name:
                group.name,
            }),
          );
      },
    );


  // ==========================================================
  // DESGLOSE
  // ==========================================================

  readonly expandedBreakdownKeys =
    signal<
      Set<string>
    >(
      new Set<
        string
      >(),
    );

  readonly filteredBreakdown =
    computed(
      () => {

        const search =
          this.normalizeText(
            this.breakdownSearch(),
          );

        if (
          !search
        ) {

          return this.breakdown();
        }

        return this.filterBreakdownNodes(
          this.breakdown(),
          search,
        );
      },
    );

  readonly visibleBreakdownRows =
    computed<
      BreakdownVisibleRow[]
    >(
      () => {

        const rows:
          BreakdownVisibleRow[] =
          [];

        const searchActive =
          Boolean(
            this.normalizeText(
              this.breakdownSearch(),
            ),
          );

        const walk =
          (
            nodes:
              entity.ExpenseAnalysisBreakdownNode[],

            depth:
              number,
          ): void => {

            for (
              const node
              of nodes
            ) {

              rows.push({
                node,
                depth,
              });

              const shouldShowChildren =
                searchActive ||
                this
                  .expandedBreakdownKeys()
                  .has(
                    node.key,
                  );

              if (
                shouldShowChildren &&
                node.children?.length
              ) {

                walk(
                  node.children,
                  depth + 1,
                );
              }
            }
          };

        walk(
          this.filteredBreakdown(),
          0,
        );

        return rows;
      },
    );


  // ==========================================================
  // FORMULARIO DE FILTROS
  // ==========================================================

  readonly filtersForm =
    this.fb.group({

      dateRange:
        this.fb.control<
          DateRangeValue | null
        >(
          null,
        ),

      projectId:
        this.fb.control<
          Catalog
          | number
          | string
          | null
        >(
          null,
        ),

      supplierId:
        this.fb.control<
          Catalog
          | number
          | string
          | null
        >(
          null,
        ),

      productId:
        this.fb.control<
          Catalog
          | number
          | string
          | null
        >(
          null,
        ),

      classificationId:
        this.fb.control<
          Catalog
          | number
          | string
          | null
        >(
          null,
        ),

      classificationState:
        this.fb.control<
          entity.ExpenseAnalysisClassificationState
          | ''
        >(
          '',
        ),

      groupId:
        this.fb.control<
          Catalog
          | number
          | string
          | null
        >(
          null,
        ),

      groupState:
        this.fb.control<
          entity.ExpenseAnalysisGroupState
          | ''
        >(
          '',
        ),

      registeredName:
        this.fb.control<
          string
          | null
        >(
          null,
        ),

      amountMin:
        this.fb.control<
          number
          | string
          | null
        >(
          null,
        ),

      amountMax:
        this.fb.control<
          number
          | string
          | null
        >(
          null,
        ),

      origin:
        this.fb.control<
          entity.ExpenseAnalysisOrigin
          | ''
        >(
          '',
        ),

      isExtraWork:
        this.fb.control<
          'true'
          | 'false'
          | ''
        >(
          '',
        ),

      search:
        this.fb.control<
          string
          | null
        >(
          null,
        ),
    });


  // ==========================================================
  // RECARGA
  // ==========================================================

  private readonly reload$ =
    new Subject<void>();

  private lastRegularFilterSignature =
    '';


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit():
    void {

    this.restoreState();

    // Estado efectivo inicial de los filtros.
    // Evita que un blur sin cambios reales vuelva a consultar.
    this.syncRegularFilterSignature();

    this.filtersForm
      .get(
        'classificationId',
      )
      ?.valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(
        () => {

          this.filtersForm
            .get(
              'groupId',
            )
            ?.setValue(
              null,
              {
                emitEvent:
                  false,
              },
            );
        },
      );

    this.watchAutocompleteControl(
      'projectId',
    );

    this.watchAutocompleteControl(
      'supplierId',
    );

    this.watchAutocompleteControl(
      'productId',
    );

    const regularFilterChanges$ =
      merge(

        this.filtersForm.controls.dateRange.valueChanges,

        this.filtersForm.controls.classificationId.valueChanges,

        this.filtersForm.controls.classificationState.valueChanges,

        this.filtersForm.controls.groupId.valueChanges,

        this.filtersForm.controls.groupState.valueChanges,

        this.filtersForm.controls.registeredName.valueChanges,

        this.filtersForm.controls.amountMin.valueChanges,

        this.filtersForm.controls.amountMax.valueChanges,

        this.filtersForm.controls.origin.valueChanges,

        this.filtersForm.controls.isExtraWork.valueChanges,

        this.filtersForm.controls.search.valueChanges,

      )
        .pipe(

          debounceTime(
            500,
          ),

          filter(
            () => {

              const dateRange =
                this.filtersForm
                  .controls
                  .dateRange
                  .value;

              if (
                !dateRange
              ) {

                return true;
              }

              const hasStart =
                Boolean(
                  dateRange.startDate,
                );

              const hasEnd =
                Boolean(
                  dateRange.endDate,
                );

              if (
                hasStart !==
                hasEnd
              ) {

                return false;
              }

              return true;
            },
          ),

          // Comparamos el payload efectivo de filtros.
          // Si el input emite lo mismo al perder el foco,
          // no se vuelve a consultar el backend.
          filter(
            () =>
              this.hasRegularFiltersChanged(),
          ),

          tap(
            () => {

              this.page.set(
                1,
              );

              this.saveState();
            },
          ),
        );

    merge(
      regularFilterChanges$,
      this.reload$,
    )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(
        () => {

          this.loadData();
        },
      );

    this.loadClassificationCatalog();

    this.loadGroupCatalog();

    this.loadData();
  }


  // ==========================================================
  // AUTOCOMPLETE
  // ==========================================================

  onAutocompleteSelected(
    control:
      ExpenseAnalysisAutocompleteControl,

    option:
      Catalog,
  ):
    void {

    this.filtersForm
      .controls[
      control
    ]
      .setValue(
        option,
        {
          emitEvent:
            false,
        },
      );

    this.page.set(
      1,
    );

    this.syncRegularFilterSignature();

    this.saveState();

    this.reload$.next();
  }


  // ==========================================================
  // FILTROS ACTIVOS
  // ==========================================================

  get hasActiveFilters():
    boolean {

    const value =
      this.filtersForm
        .getRawValue();

    return Boolean(

      value.dateRange?.startDate ||

      value.dateRange?.endDate ||

      value.projectId ||

      value.supplierId ||

      value.productId ||

      value.classificationId ||

      value.classificationState ||

      value.groupId ||

      value.groupState ||

      value.registeredName
        ?.trim() ||

      value.amountMin !==
      null ||

      value.amountMax !==
      null ||

      value.origin ||

      value.isExtraWork ||

      value.search
        ?.trim()
    );
  }


  // ==========================================================
  // TABS
  // ==========================================================

  setActiveTab(
    tab:
      ExpenseAnalysisTab,
  ):
    void {

    this.activeTab.set(
      tab,
    );

    this.saveState();
  }


  // ==========================================================
  // LIMPIAR
  // ==========================================================

  clearFilters():
    void {

    this.filtersForm.reset(
      {
        dateRange:
          null,

        projectId:
          null,

        supplierId:
          null,

        productId:
          null,

        classificationId:
          null,

        classificationState:
          '',

        groupId:
          null,

        groupState:
          '',

        registeredName:
          null,

        amountMin:
          null,

        amountMax:
          null,

        origin:
          '',

        isExtraWork:
          '',

        search:
          null,
      },
      {
        emitEvent:
          false,
      },
    );

    this.page.set(
      1,
    );

    this.limit.set(
      10,
    );

    this.activeTab.set(
      'summary',
    );

    this.breakdownSearch.set(
      '',
    );

    this
      .expandedBreakdownKeys
      .set(
        new Set<
          string
        >(),
      );

    this.syncRegularFilterSignature();

    this.removeStoredState();

    this.reload$.next();
  }


  // ==========================================================
  // PERSISTENCIA
  // ==========================================================

  private watchAutocompleteControl(
    control:
      ExpenseAnalysisAutocompleteControl,
  ):
    void {

    this.filtersForm
      .controls[
      control
    ]
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(
        value => {

          /*
           * Mientras el usuario escribe, Autocomplete manda
           * texto al FormControl.
           *
           * Ese texto NO es todavía una selección válida y
           * no debe recargar el reporte.
           */
          if (
            typeof value ===
            'string'
          ) {

            this.saveState();

            return;
          }

          /*
           * Cuando presiona la X del autocomplete,
           * el componente manda null.
           *
           * Ahí sí quitamos el filtro y recargamos.
           */
          if (
            value ===
            null
          ) {

            this.page.set(
              1,
            );

            this.syncRegularFilterSignature();

            this.saveState();

            this.reload$.next();
          }
        },
      );
  }

  private saveState():
    void {

    try {

      const value =
        this.filtersForm
          .getRawValue();

      const state:
        ExpenseAnalysisStoredState = {

        filters: {

          dateRange:
            value.dateRange ??
            null,

          /*
           * Solo persistimos autocompletes cuando realmente
           * contienen un Catalog seleccionado.
           *
           * Si contiene texto porque el usuario está escribiendo,
           * se guarda null.
           */
          projectId:
            this.getCatalogForStorage(
              value.projectId,
            ),

          supplierId:
            this.getCatalogForStorage(
              value.supplierId,
            ),

          productId:
            this.getCatalogForStorage(
              value.productId,
            ),

          classificationId:
            value.classificationId ??
            null,

          classificationState:
            value.classificationState ??
            '',

          groupId:
            value.groupId ??
            null,

          groupState:
            value.groupState ??
            '',

          registeredName:
            value.registeredName ??
            null,

          amountMin:
            value.amountMin ??
            null,

          amountMax:
            value.amountMax ??
            null,

          origin:
            value.origin ??
            '',

          isExtraWork:
            value.isExtraWork ??
            '',

          search:
            value.search ??
            null,
        },

        activeTab:
          this.activeTab(),

        page:
          this.page(),

        limit:
          this.limit(),
      };

      localStorage.setItem(
        EXPENSE_ANALYSIS_STATE_KEY,
        JSON.stringify(
          state,
        ),
      );

    } catch (
      error
    ) {

      console.warn(
        'No se pudo guardar el estado del análisis de gastos:',
        error,
      );
    }
  }

  private restoreState():
    void {

    try {

      const raw =
        localStorage.getItem(
          EXPENSE_ANALYSIS_STATE_KEY,
        );

      if (
        !raw
      ) {

        return;
      }

      const state =
        JSON.parse(
          raw,
        ) as
        Partial<
          ExpenseAnalysisStoredState
        >;

      if (
        !state.filters
      ) {

        this.removeStoredState();

        return;
      }

      const filters =
        state.filters;

      this.filtersForm.patchValue(
        {
          dateRange:
            filters.dateRange ??
            null,

          projectId:
            this.normalizeStoredCatalog(
              filters.projectId,
            ),

          supplierId:
            this.normalizeStoredCatalog(
              filters.supplierId,
            ),

          productId:
            this.normalizeStoredCatalog(
              filters.productId,
            ),

          classificationId:
            filters.classificationId ??
            null,

          classificationState:
            filters.classificationState ??
            '',

          groupId:
            filters.groupId ??
            null,

          groupState:
            filters.groupState ??
            '',

          registeredName:
            filters.registeredName ??
            null,

          amountMin:
            filters.amountMin ??
            null,

          amountMax:
            filters.amountMax ??
            null,

          origin:
            filters.origin ??
            '',

          isExtraWork:
            filters.isExtraWork ??
            '',

          search:
            filters.search ??
            null,
        },
        {
          emitEvent:
            false,
        },
      );

      const restoredPage =
        Number(
          state.page ??
          1,
        );

      const restoredLimit =
        Number(
          state.limit ??
          10,
        );

      this.page.set(

        Number.isInteger(
          restoredPage,
        ) &&
          restoredPage >
          0

          ? restoredPage

          : 1,
      );

      this.limit.set(

        Number.isInteger(
          restoredLimit,
        ) &&
          restoredLimit >
          0

          ? restoredLimit

          : 10,
      );

      this.activeTab.set(

        state.activeTab ===
          'detail'

          ? 'detail'

          : 'summary',
      );

    } catch (
      error
    ) {

      console.warn(
        'No se pudo restaurar el estado del análisis de gastos:',
        error,
      );

      this.removeStoredState();
    }
  }

  private removeStoredState():
    void {

    try {

      localStorage.removeItem(
        EXPENSE_ANALYSIS_STATE_KEY,
      );

    } catch (
      error
    ) {

      console.warn(
        'No se pudo limpiar el estado del análisis de gastos:',
        error,
      );
    }
  }

  private getCatalogForStorage(
    value:
      unknown,
  ):
    Catalog | null {

    return this.normalizeStoredCatalog(
      value,
    );
  }

  private normalizeStoredCatalog(
    value:
      unknown,
  ):
    Catalog | null {

    if (
      !value ||
      typeof value !==
      'object'
    ) {

      return null;
    }

    const catalog =
      value as
      Partial<
        Catalog
      >;

    const validId =
      typeof catalog.id ===
      'number' ||
      typeof catalog.id ===
      'string';

    if (
      !validId ||
      typeof catalog.name !==
      'string'
    ) {

      return null;
    }

    return {
      id:
        catalog.id as
        string | number,

      name:
        catalog.name,
    };
  }


  // ==========================================================
  // CARGAR REPORTE
  // ==========================================================

  private loadData():
    void {

    const filters =
      this.buildBackendFilters();

    this.loading.set(
      true,
    );

    this.service
      .getExpenseAnalysisData(
        filters,
      )
      .pipe(

        catchError(
          (
            error,
          ) => {

            console.error(
              'Error cargando análisis de gastos:',
              error,
            );

            return EMPTY;
          },
        ),

        finalize(
          () => {

            this.loading.set(
              false,
            );
          },
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(
        (
          response,
        ) => {

          this.response.set(
            response,
          );

          this.mergeBreakdownCatalogs(
            response.breakdown,
          );
        },
      );
  }


  // ==========================================================
  // BODY BACKEND
  // ==========================================================

  private buildBackendFilters():
    entity.ExpenseAnalysisFilters {

    const value =
      this.filtersForm
        .getRawValue();

    const startDate =
      toApiDate(
        value.dateRange?.startDate,
      );

    const endDate =
      toApiDate(
        value.dateRange?.endDate,
      );

    const amountMin =
      this.toNullableNumber(
        value.amountMin,
      );

    const amountMax =
      this.toNullableNumber(
        value.amountMax,
      );

    return {

      startDate:
        startDate ??
        undefined,

      endDate:
        endDate ??
        undefined,

      projectId:
        this.getNumberId(
          value.projectId,
        ) ??
        undefined,

      supplierId:
        this.getNumberId(
          value.supplierId,
        ) ??
        undefined,

      productId:
        this.getNumberId(
          value.productId,
        ) ??
        undefined,

      classificationId:
        this.getNumberId(
          value.classificationId,
        ) ??
        undefined,

      classificationState:
        value.classificationState ||
        undefined,

      groupId:
        this.getNumberId(
          value.groupId,
        ) ??
        undefined,

      groupState:
        value.groupState ||
        undefined,

      registeredName:
        this.normalizeFilterText(
          value.registeredName,
        ),

      amountMin:
        amountMin ??
        undefined,

      amountMax:
        amountMax ??
        undefined,

      origin:
        value.origin ||
        undefined,

      isExtraWork:
        value.isExtraWork ===
          'true'

          ? true

          : value.isExtraWork ===
            'false'

            ? false

            : undefined,

      search:
        this.normalizeFilterText(
          value.search,
        ),

      page:
        this.page(),

      limit:
        this.limit(),
    };
  }


  // ==========================================================
  // PAGINACIÓN DETALLE
  // ==========================================================

  onPageChange(
    event:
      PageEvent,
  ):
    void {

    this.page.set(
      event.pageIndex +
      1,
    );

    this.limit.set(
      event.pageSize,
    );

    this.saveState();

    this.reload$.next();
  }


  // ==========================================================
  // EXPORTAR
  // ==========================================================

  exportExcel():
    void {

    if (
      this.exporting()
    ) {

      return;
    }

    const filters =
      this.buildBackendFilters();

    this.exporting.set(
      true,
    );

    this.service
      .exportExpenseAnalysisExcel(
        filters,
      )
      .pipe(

        finalize(
          () => {

            this.exporting.set(
              false,
            );
          },
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({

        next:
          (
            blob,
          ) => {

            const url =
              URL.createObjectURL(
                blob,
              );

            const link =
              document.createElement(
                'a',
              );

            link.href =
              url;

            link.download =
              `analisis-gastos-${this.getFileDate()}.xlsx`;

            document.body
              .appendChild(
                link,
              );

            link.click();

            link.remove();

            URL.revokeObjectURL(
              url,
            );
          },

        error:
          (
            error,
          ) => {

            console.error(
              'Error exportando análisis de gastos:',
              error,
            );
          },
      });
  }


  // ==========================================================
  // BUSCADOR LOCAL DEL DESGLOSE
  // ==========================================================

  onBreakdownSearch(
    event:
      Event,
  ):
    void {

    const input =
      event.target as
      HTMLInputElement;

    this.breakdownSearch.set(
      input.value ??
      '',
    );
  }


  // ==========================================================
  // EXPANSIÓN
  // ==========================================================

  toggleBreakdownNode(
    node:
      entity.ExpenseAnalysisBreakdownNode,
  ):
    void {

    if (
      !node.children
        ?.length
    ) {

      return;
    }

    this.expandedBreakdownKeys
      .update(
        (
          current,
        ) => {

          const next =
            new Set(
              current,
            );

          if (
            next.has(
              node.key,
            )
          ) {

            next.delete(
              node.key,
            );

          } else {

            next.add(
              node.key,
            );
          }

          return next;
        },
      );
  }

  isExpanded(
    node:
      entity.ExpenseAnalysisBreakdownNode,
  ):
    boolean {

    return this
      .expandedBreakdownKeys()
      .has(
        node.key,
      );
  }


  // ==========================================================
  // DETALLE
  // ==========================================================

  private mapDetailRow(
    row:
      entity.ExpenseAnalysisRow,
  ):
    ExpenseAnalysisDetailTableRow {

    return {
      ...row,

      projectName:
        row.projectName ??
        'Sin proyecto',

      supplierName:
        row.supplierName ??
        'Sin proveedor',

      groupDisplayName:
        this.getGroupDisplayName(
          row,
        ),

      sourceDisplayName:
        this.getOriginLabel(
          row.source,
        ),

      extraDisplayName:
        row.isExtraWork
          ? 'Sí'
          : 'No',
    };
  }

  private getGroupDisplayName(
    row:
      entity.ExpenseAnalysisRow,
  ):
    string {

    if (
      row.classificationKind ===
      'catalog'
    ) {

      return (
        row.groupName ??
        'SIN ASIGNAR'
      );
    }

    return '—';
  }

  private getOriginLabel(
    source:
      entity.ExpenseAnalysisOrigin,
  ):
    string {

    switch (
      source
    ) {

      case 'direct':

        return 'Gasto directo';

      case 'warehouse':

        return 'Almacén';

      case 'purchase_order':

        return 'Orden de compra';

      case 'labor':

        return 'Mano de obra';

      default:

        return source;
    }
  }


  // ==========================================================
  // CATÁLOGOS DESDE BREAKDOWN
  // ==========================================================

  private mergeBreakdownCatalogs(
    nodes:
      entity.ExpenseAnalysisBreakdownNode[],
  ):
    void {

    const classifications =
      new Map<
        number,
        string
      >();

    for (
      const item
      of this.classificationOptions()
    ) {

      const id =
        Number(
          item.id,
        );

      if (
        Number.isInteger(
          id,
        )
      ) {

        classifications.set(
          id,
          item.name,
        );
      }
    }

    const groups =
      new Map<
        number,
        ExpenseAnalysisGroupCatalogItem
      >();

    for (
      const item
      of this.groupCatalog()
    ) {

      groups.set(
        item.id,
        item,
      );
    }

    const walk =
      (
        items:
          entity.ExpenseAnalysisBreakdownNode[],
      ): void => {

        for (
          const node
          of items
        ) {

          if (
            node.level ===
            'classification' &&
            node.classificationId !==
            null &&
            node.label !==
            'SIN CLASIFICAR'
          ) {

            classifications.set(
              node.classificationId,
              node.label,
            );
          }

          if (
            node.level ===
            'group' &&
            node.groupId !==
            null &&
            node.classificationId !==
            null
          ) {

            groups.set(
              node.groupId,
              {
                id:
                  node.groupId,

                name:
                  node.label,

                classificationId:
                  node.classificationId,
              },
            );
          }

          if (
            node.children
              ?.length
          ) {

            walk(
              node.children,
            );
          }
        }
      };

    walk(
      nodes,
    );

    this.classificationOptions
      .set(

        Array.from(
          classifications
            .entries(),
        )
          .map(
            (
              [
                id,
                name,
              ],
            ) => ({
              id,
              name,
            }),
          )
          .sort(
            (
              a,
              b,
            ) =>
              a.name.localeCompare(
                b.name,
                'es',
                {
                  sensitivity:
                    'base',
                },
              ),
          ),
      );

    this.groupCatalog.set(

      Array.from(
        groups.values(),
      )
        .sort(
          (
            a,
            b,
          ) =>
            a.name.localeCompare(
              b.name,
              'es',
              {
                sensitivity:
                  'base',
              },
            ),
        ),
    );
  }


  // ==========================================================
  // FILTRADO LOCAL BREAKDOWN
  // ==========================================================

  private filterBreakdownNodes(
    nodes:
      entity.ExpenseAnalysisBreakdownNode[],

    search:
      string,
  ):
    entity.ExpenseAnalysisBreakdownNode[] {

    const result:
      entity.ExpenseAnalysisBreakdownNode[] =
      [];

    for (
      const node
      of nodes
    ) {

      const children =
        this.filterBreakdownNodes(
          node.children ??
          [],
          search,
        );

      const ownMatch =
        this.normalizeText(
          node.label,
        )
          .includes(
            search,
          );

      const transaction =
        node.transaction;

      const transactionMatch =
        transaction
          ? [
            transaction.folio,
            transaction.projectName,
            transaction.supplierName,
            transaction.date,
            transaction.source,
          ]
            .some(
              (
                value,
              ) =>
                this.normalizeText(
                  value ??
                  '',
                )
                  .includes(
                    search,
                  ),
            )
          : false;

      if (
        ownMatch ||
        transactionMatch ||
        children.length
      ) {

        result.push({
          ...node,
          children,
        });
      }
    }

    return result;
  }


  // ==========================================================
  // HELPERS
  // ==========================================================

  private hasRegularFiltersChanged():
    boolean {

    const signature =
      this.buildRegularFilterSignature();

    if (
      signature ===
      this.lastRegularFilterSignature
    ) {

      return false;
    }

    this.lastRegularFilterSignature =
      signature;

    return true;
  }

  private syncRegularFilterSignature():
    void {

    this.lastRegularFilterSignature =
      this.buildRegularFilterSignature();
  }

  private buildRegularFilterSignature():
    string {

    const {
      page: _page,
      limit: _limit,
      ...filters
    } =
      this.buildBackendFilters();

    return JSON.stringify(
      filters,
    );
  }

  private normalizeFilterText(
    value:
      unknown,
  ):
    string | undefined {

    const normalized =
      String(
        value ??
        '',
      )
        .replace(
          /\s+/g,
          ' ',
        )
        .trim();

    return normalized ||
      undefined;
  }

  private getNumberId(
    value:
      unknown,
  ):
    number | null {

    const id =
      Number(
        toIdForm(
          value as any,
        ),
      );

    if (
      !id ||
      Number.isNaN(
        id,
      )
    ) {

      return null;
    }

    return id;
  }

  private toNullableNumber(
    value:
      unknown,
  ):
    number | null {

    if (
      value ===
      null ||
      value ===
      undefined ||
      value ===
      ''
    ) {

      return null;
    }

    const normalized =
      String(
        value,
      )
        .replace(
          /,/g,
          '',
        )
        .replace(
          /\$/g,
          '',
        )
        .trim();

    const numberValue =
      Number(
        normalized,
      );

    return Number.isFinite(
      numberValue,
    )
      ? numberValue
      : null;
  }

  private normalizeText(
    value:
      unknown,
  ):
    string {

    return String(
      value ??
      '',
    )
      .normalize(
        'NFD',
      )
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .trim()
      .replace(
        /\s+/g,
        ' ',
      )
      .toLowerCase();
  }

  private getFileDate():
    string {

    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() +
        1,
      )
        .padStart(
          2,
          '0',
        );

    const day =
      String(
        now.getDate(),
      )
        .padStart(
          2,
          '0',
        );

    return `${year}-${month}-${day}`;
  }


  // ==========================================================
  // CATÁLOGOS REALES
  // ==========================================================

  private loadClassificationCatalog():
    void {

    this.expenseClassificationsService
      .getClassifications({
        status:
          'active',
      })
      .pipe(

        catchError(
          (
            error,
          ) => {

            console.error(
              'Error cargando catálogo de clasificaciones:',
              error,
            );

            return EMPTY;
          },
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(
        (
          classifications,
        ) => {

          this.classificationOptions.set(

            classifications
              .map(
                (
                  classification,
                ) => ({
                  id:
                    classification.id,

                  name:
                    classification.name,
                }),
              )
              .sort(
                (
                  a,
                  b,
                ) =>
                  a.name.localeCompare(
                    b.name,
                    'es',
                    {
                      sensitivity:
                        'base',
                    },
                  ),
              ),
          );
        },
      );
  }

  private loadGroupCatalog():
    void {

    this.expenseClassificationsService
      .getGroups({
        status:
          'active',
      })
      .pipe(

        catchError(
          (
            error,
          ) => {

            console.error(
              'Error cargando catálogo de sobrenombres:',
              error,
            );

            this.groupCatalog.set(
              [],
            );

            return EMPTY;
          },
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(
        (
          groups,
        ) => {

          this.groupCatalog.set(

            groups
              .map(
                (
                  group,
                ) => ({
                  id:
                    group.id,

                  name:
                    group.name,

                  classificationId:
                    group.classification.id,
                }),
              )
              .sort(
                (
                  a,
                  b,
                ) =>
                  a.name.localeCompare(
                    b.name,
                    'es',
                    {
                      sensitivity:
                        'base',
                    },
                  ),
              ),
          );
        },
      );
  }
}