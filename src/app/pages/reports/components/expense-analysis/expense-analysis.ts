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

    groupDisplayName:
      string;

    sourceDisplayName:
      string;

    extraDisplayName:
      string;
  };


const DETAIL_COLUMNS:
  ColumnsConfig[] = [

    {
      key:
        'date',

      label:
        'Fecha',

      type:
        'date',
    },

    {
      key:
        'projectName',

      label:
        'Proyecto',
    },

    {
      key:
        'supplierName',

      label:
        'Proveedor',
    },

    {
      key:
        'classificationName',

      label:
        'Clasificación',
    },

    {
      key:
        'groupDisplayName',

      label:
        'Sobrenombre',
    },

    {
      key:
        'registeredName',

      label:
        'Nombre registrado',
    },

    {
      key:
        'sourceDisplayName',

      label:
        'Origen',

      type:
        'chip',

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
      key:
        'folio',

      label:
        'Folio',
    },

    {
      key:
        'expenseAmount',

      label:
        'Importe',

      type:
        'money',

      align:
        'right',
    },

    {
      key:
        'paidAmount',

      label:
        'Pagado',

      type:
        'money',

      align:
        'right',
    },

    {
      key:
        'cxpBalance',

      label:
        'Saldo CxP',

      type:
        'money',

      align:
        'right',
    },

    {
      key:
        'purchaseOrderCommitment',

      label:
        'Compromiso O.C.',

      type:
        'money',

      align:
        'right',
    },

    {
      key:
        'extraDisplayName',

      label:
        'Extra',

      type:
        'chip',

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


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit():
    void {


    // --------------------------------------------------------
    // Si cambia la clasificación, el grupo seleccionado
    // anteriormente deja de ser confiable.
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // AUTO REFRESH
    // --------------------------------------------------------

    const filterChanges$ =
      this.filtersForm
        .valueChanges
        .pipe(

          debounceTime(
            350,
          ),

          filter(
            (
              value,
            ) => {

              const dateRange =
                value.dateRange;


              // Sin filtro de fecha:
              // puede consultar normalmente.

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


              // Si empezó a seleccionar un rango,
              // esperamos a que estén ambas fechas.

              if (
                hasStart !==
                hasEnd
              ) {

                return false;
              }


              return true;
            },
          ),

          tap(
            () => {

              this.page.set(
                1,
              );
            },
          ),
        );


    merge(
      filterChanges$,
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


    this.loadGroupCatalog();

    this.loadData();
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


    this.reload$.next();
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
        value.registeredName
          ?.trim() ||
        undefined,


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
        value.search
          ?.trim() ||
        undefined,


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
  // CATÁLOGO REAL DE SOBRENOMBRES
  // ==========================================================

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