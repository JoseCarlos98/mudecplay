import { CommonModule, } from '@angular/common';
import { Component, OnInit, computed, inject, signal, } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, } from '@angular/forms';
import { finalize, forkJoin, } from 'rxjs';
import { MatIconModule, } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent, } from '@angular/material/paginator';
import * as entity from './interfaces/expense-classifications.interfaces';
import { ExpenseClassificationsService, } from './services/expense-classifications.service';
import { ModuleHeaderConfig, } from '../../shared/ui/module-header/interfaces/module-header-interface';
import { Catalog, } from '../../shared/interfaces/general-interfaces';
import { ColumnsConfig, ColumnVariant, DataTableActionEvent, DataTableExtraAction, DataTableSortEvent, } from '../../shared/ui/data-table/interfaces/table-interfaces';
import { ModuleHeader, } from '../../shared/ui/module-header/module-header';
import { DataTable, } from '../../shared/ui/data-table/data-table';
import { InputField, } from '../../shared/ui/input-field/input-field';
import { InputSelect, } from '../../shared/ui/input-select/input-select';
import { BtnsSection, } from '../../shared/ui/btns-section/btns-section';
import { LoadingOverlay, } from '../../shared/ui/loading-overlay/loading-overlay';
import { toIdForm, } from '../../shared/helpers/general-helpers';
import { DialogService } from '../../shared/services/dialog.service';
import { ModalExpenseReportClassification } from './components/modal-expense-report-classification/modal-expense-report-classification';
import { ModalReassignExpenseClassification } from './components/modal-reassign-expense-classification/modal-reassign-expense-classification';
// =========================================================
// HEADER
// =========================================================
const HEADER_CONFIG: ModuleHeaderConfig = {};
// =========================================================
// OPCIONES
// =========================================================
const SOURCE_TYPE_OPTIONS: Catalog[] = [
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
const STATUS_OPTIONS: Catalog[] = [
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
const PENDING_COLUMNS: ColumnsConfig[] = [
    {
        key: 'selected',
        label: 'Elegir',
        type: 'select',
        align: 'center',
        selectActionType: 'togglePendingSelection',
        selectedResolver: (row: entity.ExpenseClassificationPendingTableRow) => row.selected === true,
        selectTooltip: (row: entity.ExpenseClassificationPendingTableRow) => row.selected
            ? 'Quitar de la selección'
            : 'Seleccionar para homologar',
    },
    {
        key: 'displayName',
        label: 'Nombre',
        sortable: true,
        sortKey: 'display_name',
    },
    {
        key: 'sourceTypeLabel',
        label: 'Tipo',
        type: 'chip',
        sortable: true,
        sortKey: 'source_type',
        variantResolver: (row: entity.ExpenseClassificationPendingTableRow) => resolveSourceTypeVariant(row.sourceType),
    },
    {
        key: 'itemCount',
        label: 'Usos',
        align: 'right',
        sortable: true,
        sortKey: 'item_count',
    },
    {
        key: 'purchaseCount',
        label: 'Compras',
        align: 'right',
        sortable: true,
        sortKey: 'purchase_count',
    },
];
const PENDING_DISPLAYED_COLUMNS = PENDING_COLUMNS.map((column) => column.key);
type ExpenseClassificationMappingSelectableRow = entity.ExpenseClassificationMappingTableRow & {
    selected?: boolean;
};
// =========================================================
// COLUMNAS: HOMOLOGADOS
// =========================================================
const MAPPING_COLUMNS: ColumnsConfig[] = [
    {
        key: 'selected',
        label: 'Elegir',
        type: 'select',
        align: 'center',
        selectActionType: 'toggleMappingSelection',
        selectedResolver: (row: ExpenseClassificationMappingSelectableRow) => row.selected === true,
        selectDisabledResolver: (row: ExpenseClassificationMappingSelectableRow) => !row.isActive,
        selectTooltip: (row: ExpenseClassificationMappingSelectableRow) => !row.isActive
            ? 'Solo las homologaciones activas pueden agruparse'
            : row.selected
                ? 'Quitar de la selección'
                : 'Seleccionar para asignar grupo',
    },
    {
        key: 'displayName',
        label: 'Concepto / Producto',
        sortable: true,
        sortKey: 'display_name',
    },
    {
        key: 'sourceTypeLabel',
        label: 'Tipo',
        type: 'chip',
        sortable: true,
        sortKey: 'source_type',
        variantResolver: (row: ExpenseClassificationMappingSelectableRow) => resolveSourceTypeVariant(row.sourceType),
    },
    {
        key: 'classificationName',
        label: 'Clasificación actual',
        type: 'chip',
        sortable: true,
        sortKey: 'classification',
        variantResolver: () => 'chip-neutral',
    },
    {
        key: 'groupName',
        label: 'Grupo homologado',
        type: 'chip',
        variantResolver: (row: ExpenseClassificationMappingSelectableRow) => (row.group ? 'chip-success' : 'chip-neutral'),
    },
    {
        key: 'statusLabel',
        label: 'Estado',
        type: 'chip',
        sortable: true,
        sortKey: 'status',
        variantResolver: (row: ExpenseClassificationMappingSelectableRow) => (row.isActive ? 'chip-success' : 'chip-danger'),
    },
];
const MAPPING_DISPLAYED_COLUMNS = [
    ...MAPPING_COLUMNS.map((column) => column.key),
    'actions',
];
// =========================================================
// HELPERS VISUALES
// =========================================================
function resolveSourceTypeVariant(sourceType: entity.ExpenseClassificationSourceType): ColumnVariant {
    return sourceType === 'concept'
        ? 'chip-neutral'
        : 'chip-success';
}
// =========================================================
// COMPONENTE
// =========================================================
@Component({
    selector: 'app-expense-classifications',
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
    templateUrl: './expense-classifications.html',
    styleUrl: './expense-classifications.scss',
})
export class ExpenseClassifications implements OnInit {
    // =========================================================
    // INYECCIONES
    // =========================================================
    private readonly service = inject(ExpenseClassificationsService);
    private readonly fb = inject(FormBuilder);
    private readonly dialogService = inject(DialogService);
    // =========================================================
    // UI
    // =========================================================
    pendingSorts: entity.ExpenseClassificationSortItem[] = [];
    mappingSorts: entity.ExpenseClassificationSortItem[] = [];
    readonly headerConfig = HEADER_CONFIG;
    readonly activeTab = signal<entity.ExpenseClassificationsTab>('pending');
    readonly pendingColumns = PENDING_COLUMNS;
    readonly pendingDisplayedColumns = PENDING_DISPLAYED_COLUMNS;
    readonly mappingColumns = MAPPING_COLUMNS;
    readonly mappingDisplayedColumns = MAPPING_DISPLAYED_COLUMNS;
    readonly sourceTypeOptions = SOURCE_TYPE_OPTIONS;
    readonly statusOptions = STATUS_OPTIONS;
    readonly tableActionPermissions = {
        showEdit: false,
        showDelete: false,
    };
    // =========================================================
    // LOADING
    // =========================================================
    readonly loadingClassifications = signal(false);
    readonly loadingPending = signal(false);
    readonly loadingMappings = signal(false);
    readonly loadingGroups = signal(false);
    readonly classifyingPending = signal(false);
    readonly changingMappingStatus = signal(false);
    readonly assigningGroup = signal(false);
    readonly savingGroup = signal(false);
    readonly loadingPage = computed(() => this.loadingClassifications() ||
        this.loadingPending() ||
        this.loadingMappings() ||
        this.loadingGroups() ||
        this.classifyingPending() ||
        this.changingMappingStatus() ||
        this.assigningGroup() ||
        this.savingGroup());
    // =========================================================
    // CLASIFICACIONES
    // =========================================================
    classifications: entity.ExpenseReportClassification[] = [];
    get activeClassifications(): entity.ExpenseReportClassification[] {
        return this.classifications.filter((classification) => classification.isActive);
    }
    classificationOptions: Catalog[] = [];
    readonly selectedClassificationId = signal<number | null>(null);
    readonly classificationStatusView = signal<'active' | 'inactive'>('active');
    get selectedClassification(): entity.ExpenseReportClassification | null {
        const classificationId = this.selectedClassificationId();
        if (classificationId === null) {
            return null;
        }
        return (this.classifications.find((classification) => classification.id ===
            classificationId) ??
            null);
    }
    get selectedClassificationIsActive(): boolean {
        return Boolean(this.selectedClassification
            ?.isActive);
    }
    get inactiveClassifications(): entity.ExpenseReportClassification[] {
        return this.classifications.filter((classification) => !classification.isActive);
    }
    get visibleClassifications(): entity.ExpenseReportClassification[] {
        return this.classificationStatusView() ===
            'active'
            ? this.activeClassifications
            : this.inactiveClassifications;
    }
    get selectedClassificationName(): string {
        const classification = this.selectedClassification;
        if (!classification) {
            return 'Sin seleccionar';
        }
        return classification.isActive
            ? classification.name
            : `${classification.name} (inactiva)`;
    }
    // =========================================================
    // PENDIENTES
    // =========================================================
    pendingItems: entity.ExpenseClassificationPendingItem[] = [];
    pendingRows: entity.ExpenseClassificationPendingTableRow[] = [];
    pendingResponse: entity.ExpenseClassificationPendingResponse = {
        data: [],
        meta: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
        },
    };
    /*
  
     * /pending se solicita con all=true.
  
     * pendingRows contiene todos los resultados del filtro actual.
  
     */
    get pendingVisibleRows(): entity.ExpenseClassificationPendingTableRow[] {
        return this.pendingRows;
    }
    readonly selectedPendingKeys = signal<Set<string>>(new Set<string>());
    /*
  
     * Conserva los objetos seleccionados mientras el usuario
  
     * filtra o trabaja con la lista completa de pendientes.
  
     */
    readonly selectedPendingItems = signal<Map<string, entity.ExpenseClassificationPendingItem>>(new Map<string, entity.ExpenseClassificationPendingItem>());
    readonly selectedPendingCount = computed(() => this.selectedPendingKeys()
        .size);
    // =========================================================
    // HOMOLOGADOS
    // =========================================================
    mappingsResponse: entity.ExpenseClassificationMappingsResponse = {
        data: [],
        meta: {
            total: 0,
            page: 1,
            limit: 25,
            totalPages: 0,
        },
    };
    mappingRows: ExpenseClassificationMappingSelectableRow[] = [];
    mappingFilters: entity.ExpenseClassificationMappingFilters = {
        search: '',
        sourceType: undefined,
        status: 'active',
        classificationId: null,
        sorts: [],
        page: 1,
        limit: 25,
    };
    readonly selectedMappingKeys = signal<Set<string>>(new Set<string>());
    readonly selectedMappingItems = signal<Map<string, entity.ExpenseClassificationMapping>>(new Map<string, entity.ExpenseClassificationMapping>());
    readonly selectedMappingCount = computed(() => this.selectedMappingKeys().size);
    readonly selectedMappingClassificationId = computed<number | null>(() => {
        const first = this.selectedMappingItems().values().next().value as entity.ExpenseClassificationMapping | undefined;
        return first?.classification.id ?? null;
    });
    get selectedMappingClassificationName(): string {
        const first = this.selectedMappingItems().values().next().value as entity.ExpenseClassificationMapping | undefined;
        return first?.classification.name ?? 'Sin selección';
    }
    groups: entity.ExpenseReportGroup[] = [];
    readonly groupStatusView = signal<'active' | 'inactive'>('active');
    readonly selectedGroupId = signal<number | null>(null);
    private loadedGroupsClassificationId: number | null = null;
    get visibleGroups(): entity.ExpenseReportGroup[] {
        const active = this.groupStatusView() === 'active';
        return this.groups.filter((group) => group.isActive === active);
    }
    get activeGroupCount(): number {
        return this.groups.filter((group) => group.isActive).length;
    }
    get inactiveGroupCount(): number {
        return this.groups.filter((group) => !group.isActive).length;
    }
    get hasGroupName(): boolean {
        return this.groupCatalogForm.controls.name.getRawValue().trim().length > 0;
    }
    get selectedGroup(): entity.ExpenseReportGroup | null {
        const id = this.selectedGroupId();
        return id === null
            ? null
            : this.groups.find((group) => group.id === id) ?? null;
    }
    get groupManagerClassificationId(): number | null {
        return toIdForm(this.groupCatalogForm.controls.classificationId.getRawValue());
    }
    get groupManagerClassification(): entity.ExpenseReportClassification | null {
        const id = this.groupManagerClassificationId;
        return id === null
            ? null
            : this.classifications.find((item) => item.id === id) ?? null;
    }
    get activeGroupOptions(): Catalog[] {
        return [
            { id: '', name: 'Sin asignar' },
            ...this.groups
                .filter((group) => group.isActive)
                .map((group) => ({
                    id: String(group.id),
                    name: group.name,
                })),
        ];
    }
    get selectedAssignmentGroupName(): string {
        const groupId = toIdForm(this.groupAssignmentForm.controls.groupId.getRawValue());
        if (!groupId) {
            return 'Sin asignar';
        }
        return (this.groups.find((group) => group.id === groupId)?.name ??
            'Grupo no disponible');
    }
    get canSelectVisibleMappings(): boolean {
        const activeRows = this.mappingRows.filter((row) => row.isActive);
        if (!activeRows.length) {
            return false;
        }
        const selectedClassificationId = this.selectedMappingClassificationId();
        if (selectedClassificationId !== null) {
            return activeRows.some((row) => row.classification.id === selectedClassificationId);
        }
        return new Set(activeRows.map((row) => row.classification.id)).size === 1;
    }
    // =========================================================
    // FORMULARIOS
    // =========================================================
    readonly pendingFilterForm = this.fb.group({
        search: this.fb.control<string>('', {
            nonNullable: true,
        }),
        sourceType: this.fb.control<Catalog | string | null>(null),
    });
    readonly mappingFilterForm = this.fb.group({
        search: this.fb.control<string>('', {
            nonNullable: true,
        }),
        sourceType: this.fb.control<Catalog | string | null>(null),
        status: this.fb.control<Catalog | string | null>({
            id: 'active',
            name: 'Activos',
        }),
        classificationId: this.fb.control<Catalog | number | string | null>(null),
    });
    readonly groupAssignmentForm = this.fb.group({
        groupId: this.fb.control<Catalog | number | string | null>(null),
    });
    readonly groupCatalogForm = this.fb.group({
        classificationId: this.fb.control<Catalog | number | string | null>(null),
        name: this.fb.control<string>('', { nonNullable: true }),
    });
    // =========================================================
    // ACCIONES DE HOMOLOGADOS
    // =========================================================
    readonly mappingExtraActions: DataTableExtraAction<ExpenseClassificationMappingSelectableRow>[] = [
        {
            type: 'reassign',
            icon: 'edit',
            tooltip: 'Cambiar clasificación',
        },
        {
            type: 'deactivate',
            icon: 'block',
            tooltip: 'Desactivar homologación',
            iconClass: 'table-action-icon--danger',
            visible: (row) => row.isActive,
        },
        {
            type: 'reactivate',
            icon: 'restart_alt',
            tooltip: 'Reactivar homologación',
            iconClass: 'table-action-icon--success',
            visible: (row) => !row.isActive,
        },
    ];
    // =========================================================
    // INIT
    // =========================================================
    ngOnInit(): void {
        this.loadInitialData();
    }
    // =========================================================
    // CARGA INICIAL
    // =========================================================
    private loadInitialData(): void {
        this.loadingClassifications
            .set(true);
        this.loadingPending
            .set(true);
        this.loadingMappings
            .set(true);
        forkJoin({
            classifications: this.service
                .getClassifications({
                    status: 'all',
                }),
            pending: this.service
                .getPendingClassifications({
                    all: true,
                }),
            /*
      
             * Solo necesitamos conocer el total inicial
      
             * de homologaciones para el resumen.
      
             *
      
             * Pedimos 1 registro porque la tabla completa
      
             * se cargará cuando el usuario entre a
      
             * la pestaña Homologados.
      
             */
            mappings: this.service
                .getMappings({
                    ...this.mappingFilters,
                    page: 1,
                    limit: 1,
                }),
        })
            .pipe(finalize(() => {
                this.loadingClassifications
                    .set(false);
                this.loadingPending
                    .set(false);
                this.loadingMappings
                    .set(false);
            }))
            .subscribe({
                next: (response) => {
                    // =====================================================
                    // CLASIFICACIONES
                    // =====================================================
                    this.setClassifications(response.classifications);
                    // =====================================================
                    // PENDIENTES
                    // =====================================================
                    this.pendingResponse =
                        response.pending;
                    this.setPendingItems(response.pending.data);
                    // =====================================================
                    // HOMOLOGADOS - SOLO META INICIAL
                    // =====================================================
                    /*
          
                     * No guardamos el único registro solicitado.
          
                     *
          
                     * Aquí únicamente necesitamos que el resumen superior
          
                     * conozca el total real.
          
                     *
          
                     * Cuando se abra la pestaña Homologados,
          
                     * loadMappings() traerá la página completa.
          
                     */
                    this.mappingsResponse = {
                        data: [],
                        meta: response.mappings.meta,
                    };
                },
            });
    }
    // =========================================================
    // TABS
    // =========================================================
    setActiveTab(tab: entity.ExpenseClassificationsTab): void {
        if (this.activeTab() ===
            tab) {
            return;
        }
        this.activeTab
            .set(tab);
        if (tab ===
            'homologated') {
            this.loadMappings();
            if (this.mappingFilters.classificationId) {
                this.setGroupManagementClassification(this.mappingFilters.classificationId);
            }
        }
    }
    // =========================================================
    // CLASIFICACIONES
    // =========================================================
    private setClassifications(classifications: entity.ExpenseReportClassification[]): void {
        this.classifications =
            classifications;
        this.classificationOptions =
            classifications
                .filter((item) => item.isActive)
                .map((item) => ({
                    id: String(item.id),
                    name: item.name,
                }));
    }
    // =========================================================
    // CLASIFICACIONES:
    // CREAR
    // =========================================================
    openCreateClassificationModal(): void {
        const modalData: entity.ExpenseReportClassificationModalData = {
            mode: 'create',
        };
        this.dialogService
            .open(ModalExpenseReportClassification, modalData, 'medium')
            .afterClosed()
            .subscribe((classification: entity.ExpenseReportClassification | null) => {
                if (!classification?.id) {
                    return;
                }
                /*
      
                 * Actualizamos únicamente el catálogo.
      
                 *
      
                 * NO recargamos pendientes para evitar
      
                 * perder selección, búsqueda, página, etc.
      
                 */
                const classifications = this.classifications
                    .filter((item) => item.id !==
                        classification.id);
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
                this.classificationStatusView
                    .set('active');
                this.selectedClassificationId
                    .set(classification.id);
            });
    }
    // =========================================================
    // CLASIFICACIONES:
    // EDITAR
    // =========================================================
    openEditSelectedClassificationModal(): void {
        const classificationId = this.selectedClassificationId();
        if (classificationId === null) {
            return;
        }
        const classification = this.classifications.find((item) => item.id ===
            classificationId);
        if (!classification) {
            return;
        }
        const modalData: entity.ExpenseReportClassificationModalData = {
            mode: 'edit',
            classification,
        };
        this.dialogService
            .open(ModalExpenseReportClassification, modalData, 'medium')
            .afterClosed()
            .subscribe((updatedClassification: entity.ExpenseReportClassification | null) => {
                if (!updatedClassification?.id) {
                    return;
                }
                this.setClassifications(this.classifications.map((item) => item.id ===
                    updatedClassification.id
                    ? updatedClassification
                    : item));
                /*
      
                 * Conservamos seleccionada la clasificación
      
                 * editada para no interrumpir el flujo
      
                 * de homologación que el usuario lleva.
      
                 */
                this.selectedClassificationId
                    .set(updatedClassification.id);
            });
    }
    setClassificationStatusView(status: 'active' | 'inactive'): void {
        if (this.classificationStatusView() ===
            status) {
            return;
        }
        this.classificationStatusView
            .set(status);
        this.selectedClassificationId
            .set(null);
    }
    confirmDeactivateSelectedClassification(): void {
        const classification = this.selectedClassification;
        if (!classification ||
            !classification.isActive ||
            this.loadingClassifications()) {
            return;
        }
        this.dialogService
            .confirm({
                title: 'Desactivar clasificación',
                message: `¿Deseas desactivar "${classification.name}"? ` +
                    'Dejará de estar disponible para nuevas homologaciones. ' +
                    'Las homologaciones existentes no se eliminan.',
                confirmText: 'Desactivar',
                cancelText: 'Cancelar',
            })
            .subscribe((confirmed: boolean) => {
                if (!confirmed) {
                    return;
                }
                this.deactivateSelectedClassification(classification.id);
            });
    }
    private deactivateSelectedClassification(classificationId: number): void {
        this.loadingClassifications
            .set(true);
        this.service
            .deactivateClassification(classificationId)
            .pipe(finalize(() => this.loadingClassifications
                .set(false)))
            .subscribe({
                next: (response) => {
                    const updatedClassification = response.classification;
                    this.setClassifications(this.classifications.map((item) => item.id ===
                        updatedClassification.id
                        ? updatedClassification
                        : item));
                    this.classificationStatusView
                        .set('inactive');
                    this.selectedClassificationId
                        .set(updatedClassification.id);
                },
            });
    }
    confirmReactivateSelectedClassification(): void {
        const classification = this.selectedClassification;
        if (!classification ||
            classification.isActive ||
            this.loadingClassifications()) {
            return;
        }
        this.dialogService
            .confirm({
                title: 'Reactivar clasificación',
                message: `¿Deseas reactivar "${classification.name}"? ` +
                    'Volverá a estar disponible para nuevas homologaciones.',
                confirmText: 'Reactivar',
                cancelText: 'Cancelar',
            })
            .subscribe((confirmed: boolean) => {
                if (!confirmed) {
                    return;
                }
                this.reactivateSelectedClassification(classification.id);
            });
    }
    private reactivateSelectedClassification(classificationId: number): void {
        this.loadingClassifications
            .set(true);
        this.service
            .reactivateClassification(classificationId)
            .pipe(finalize(() => this.loadingClassifications
                .set(false)))
            .subscribe({
                next: (response) => {
                    const updatedClassification = response.classification;
                    this.setClassifications(this.classifications.map((item) => item.id ===
                        updatedClassification.id
                        ? updatedClassification
                        : item));
                    this.classificationStatusView
                        .set('active');
                    this.selectedClassificationId
                        .set(updatedClassification.id);
                },
            });
    }
    // =========================================================
    // PENDIENTES:
    // TRANSFORMACIÓN
    // =========================================================
    private setPendingItems(items: entity.ExpenseClassificationPendingItem[]): void {
        this.pendingItems =
            items;
        const selected = this.selectedPendingKeys();
        this.pendingRows =
            items.map((item) => {
                const id = this.getPendingKey(item);
                return {
                    ...item,
                    id,
                    sourceTypeLabel: item.sourceType ===
                        'concept'
                        ? 'Concepto'
                        : 'Producto histórico',
                    selected: selected.has(id),
                };
            });
    }
    private getPendingKey(item: entity.ExpenseClassificationPendingItem): string {
        if (item.sourceType ===
            'concept') {
            return (`concept:${item.normalizedConcept}`);
        }
        return (`product:${item.productId}`);
    }
    // =========================================================
    // PENDIENTES:
    // SELECCIÓN
    // =========================================================
    onPendingTableAction(event: DataTableActionEvent<entity.ExpenseClassificationPendingTableRow>): void {
        if (event.type !==
            'togglePendingSelection') {
            return;
        }
        this.togglePendingSelection(event.row);
    }
    private togglePendingSelection(row: entity.ExpenseClassificationPendingTableRow): void {
        const nextKeys = new Set(this.selectedPendingKeys());
        const nextItems = new Map(this.selectedPendingItems());
        if (nextKeys.has(row.id)) {
            nextKeys.delete(row.id);
            nextItems.delete(row.id);
        }
        else {
            nextKeys.add(row.id);
            nextItems.set(row.id, row);
        }
        this.selectedPendingKeys
            .set(nextKeys);
        this.selectedPendingItems
            .set(nextItems);
        this.syncPendingSelection();
    }
    /*
  
     * Agrega a la selección todos los registros
  
     * actualmente cargados por el filtro.
  
     */
    selectAllPendingResults(): void {
        const nextKeys = new Set(this.selectedPendingKeys());
        const nextItems = new Map(this.selectedPendingItems());
        for (const row of this.pendingRows) {
            nextKeys.add(row.id);
            nextItems.set(row.id, row);
        }
        this.selectedPendingKeys
            .set(nextKeys);
        this.selectedPendingItems
            .set(nextItems);
        this.syncPendingSelection();
    }
    clearPendingSelection(): void {
        this.selectedPendingKeys
            .set(new Set<string>());
        this.selectedPendingItems
            .set(new Map<string, entity.ExpenseClassificationPendingItem>());
        this.syncPendingSelection();
    }
    private syncPendingSelection(): void {
        const selected = this.selectedPendingKeys();
        this.pendingRows =
            this.pendingRows.map((row) => ({
                ...row,
                selected: selected.has(row.id),
            }));
    }
    // =========================================================
    // PENDIENTES:
    // FILTROS
    // =========================================================
    applyPendingFilters(): void {
        const form = this.pendingFilterForm
            .getRawValue();
        const sourceType = this.resolveSourceType(form.sourceType);
        this.loadPending({
            search: form.search.trim(),
            sourceType,
            sorts: [
                ...this.pendingSorts,
            ],
        });
    }
    clearPendingFilters(): void {
        this.pendingFilterForm
            .reset({
                search: '',
                sourceType: null,
            });
        this.pendingSorts = [];
        this.loadPending({
            sorts: [],
        });
    }
    private loadPending(filters: entity.ExpenseClassificationPendingFilters = {}): void {
        this.loadingPending
            .set(true);
        this.service
            .getPendingClassifications({
                ...filters,
                all: true,
            })
            .pipe(finalize(() => this.loadingPending
                .set(false)))
            .subscribe({
                next: (response) => {
                    this.pendingResponse =
                        response;
                    this.setPendingItems(response.data);
                },
            });
    }
    // =========================================================
    // HOMOLOGADOS:
    // CARGA
    // =========================================================
    private loadMappings(): void {
        this.loadingMappings
            .set(true);
        this.service
            .getMappings(this.mappingFilters)
            .pipe(finalize(() => this.loadingMappings
                .set(false)))
            .subscribe({
                next: (response) => {
                    this.mappingsResponse =
                        response;
                    const selected = this.selectedMappingKeys();
                    this.mappingRows = response.data.map((item) => {
                        const id = this.getMappingKey(item);
                        return {
                            ...item,
                            id,
                            sourceTypeLabel: item.sourceType === 'concept'
                                ? 'Concepto'
                                : 'Producto histórico',
                            classificationName: item.classification.name,
                            groupName: item.group?.name ?? 'Sin asignar',
                            statusLabel: item.isActive ? 'Activo' : 'Inactivo',
                            selected: selected.has(id),
                        };
                    });
                },
            });
    }
    // =========================================================
    // HOMOLOGADOS:
    // FILTROS
    // =========================================================
    applyMappingFilters(): void {
        const form =
            this.mappingFilterForm
                .getRawValue();

        const rawClassificationId =
            toIdForm(
                form.classificationId,
            );

        const classificationId =
            rawClassificationId !== null &&
                rawClassificationId > 0
                ? rawClassificationId
                : null;

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

            classificationId,

            sorts: [
                ...this.mappingSorts,
            ],

            page: 1,
        };

        if (
            classificationId &&
            this.selectedMappingCount() === 0
        ) {
            this.setGroupManagementClassification(
                classificationId,
            );
        }

        this.loadMappings();
    }

    clearMappingFilters(): void {
        this.mappingFilterForm
            .reset({
                search: '',
                sourceType: null,
                status: {
                    id: 'active',
                    name: 'Activos',
                },
                classificationId: null,
            });
        this.mappingSorts = [];
        this.mappingFilters = {
            search: '',
            sourceType: undefined,
            status: 'active',
            classificationId: null,
            sorts: [],
            page: 1,
            limit: this.mappingFilters
                .limit,
        };
        this.loadMappings();
    }
    // =========================================================
    // HOMOLOGADOS:
    // PAGINACIÓN
    // =========================================================
    onMappingPageChange(event: PageEvent): void {
        this.mappingFilters = {
            ...this.mappingFilters,
            page: event.pageIndex + 1,
            limit: event.pageSize,
        };
        this.loadMappings();
    }
    // =========================================================
    // HOMOLOGADOS:
    // ACCIONES
    // =========================================================
    onMappingTableAction(event: DataTableActionEvent<ExpenseClassificationMappingSelectableRow>): void {
        switch (event.type) {
            case 'toggleMappingSelection':
                this.toggleMappingSelection(event.row);
                break;
            case 'reassign':
                this.openReassignMappingModal(event.row);
                break;
            case 'deactivate':
                this.confirmDeactivateMapping(event.row);
                break;
            case 'reactivate':
                this.confirmReactivateMapping(event.row);
                break;
        }
    }
    private getMappingKey(mapping: entity.ExpenseClassificationMapping): string {
        return `${mapping.sourceType}:${mapping.mappingId}`;
    }
    private toggleMappingSelection(row: ExpenseClassificationMappingSelectableRow): void {
        if (!row.isActive) {
            return;
        }
        const nextKeys = new Set(this.selectedMappingKeys());
        const nextItems = new Map(this.selectedMappingItems());
        if (nextKeys.has(row.id)) {
            nextKeys.delete(row.id);
            nextItems.delete(row.id);
        }
        else {
            const selectedClassificationId = this.selectedMappingClassificationId();
            if (selectedClassificationId !== null &&
                row.classification.id !== selectedClassificationId) {
                return;
            }
            nextKeys.add(row.id);
            nextItems.set(row.id, row);
        }
        this.selectedMappingKeys.set(nextKeys);
        this.selectedMappingItems.set(nextItems);
        this.syncMappingSelection();
        this.syncGroupContextWithMappingSelection();
    }
    selectVisibleMappings(): void {
        const activeRows = this.mappingRows.filter((row) => row.isActive);
        if (!activeRows.length) {
            return;
        }
        let targetClassificationId = this.selectedMappingClassificationId();
        if (targetClassificationId === null) {
            const classificationIds = [
                ...new Set(activeRows.map((row) => row.classification.id)),
            ];
            if (classificationIds.length !== 1) {
                return;
            }
            targetClassificationId = classificationIds[0];
        }
        const nextKeys = new Set(this.selectedMappingKeys());
        const nextItems = new Map(this.selectedMappingItems());
        for (const row of activeRows) {
            if (row.classification.id !== targetClassificationId) {
                continue;
            }
            nextKeys.add(row.id);
            nextItems.set(row.id, row);
        }
        this.selectedMappingKeys.set(nextKeys);
        this.selectedMappingItems.set(nextItems);
        this.syncMappingSelection();
        this.syncGroupContextWithMappingSelection();
    }
    clearMappingSelection(): void {
        this.selectedMappingKeys.set(new Set<string>());
        this.selectedMappingItems.set(new Map<string, entity.ExpenseClassificationMapping>());
        this.groupAssignmentForm.reset({ groupId: null });
        this.syncMappingSelection();
    }
    private removeMappingFromSelection(mapping: entity.ExpenseClassificationMapping): void {
        const key = this.getMappingKey(mapping);
        if (!this.selectedMappingKeys().has(key)) {
            return;
        }
        const nextKeys = new Set(this.selectedMappingKeys());
        const nextItems = new Map(this.selectedMappingItems());
        nextKeys.delete(key);
        nextItems.delete(key);
        this.selectedMappingKeys.set(nextKeys);
        this.selectedMappingItems.set(nextItems);
        this.syncMappingSelection();
        this.syncGroupContextWithMappingSelection();
    }
    private syncMappingSelection(): void {
        const selected = this.selectedMappingKeys();
        this.mappingRows = this.mappingRows.map((row) => ({
            ...row,
            selected: selected.has(row.id),
        }));
    }
    private syncGroupContextWithMappingSelection(): void {
        const classificationId = this.selectedMappingClassificationId();
        if (classificationId === null) {
            return;
        }
        this.setGroupManagementClassification(classificationId);
    }
    private setGroupManagementClassification(classificationId: number): void {
        const classification = this.classifications.find((item) => item.id === classificationId && item.isActive);
        if (!classification) {
            return;
        }
        const currentClassificationId = this.groupManagerClassificationId;
        if (currentClassificationId !== classificationId) {
            const option = this.classificationOptions.find((item) => Number(item.id) === classificationId);
            this.groupCatalogForm.controls.classificationId.setValue(option ?? String(classificationId));
            this.selectedGroupId.set(null);
            this.groupCatalogForm.controls.name.setValue('');
            this.groupAssignmentForm.reset({ groupId: null });
        }
        if (this.loadedGroupsClassificationId !== classificationId) {
            this.loadGroups(classificationId);
        }
    }
    loadGroupCatalog(): void {
        const classificationId = this.groupManagerClassificationId;
        const selectedClassificationId = this.selectedMappingClassificationId();
        if (selectedClassificationId !== null &&
            classificationId !== selectedClassificationId) {
            this.clearMappingSelection();
        }
        this.selectedGroupId.set(null);
        this.groupCatalogForm.controls.name.setValue('');
        this.groupAssignmentForm.reset({ groupId: null });
        if (classificationId === null) {
            this.groups = [];
            this.loadedGroupsClassificationId = null;
            return;
        }
        this.loadGroups(classificationId);
    }
    private loadGroups(classificationId: number): void {
        this.loadingGroups.set(true);
        this.service
            .getGroups({
                classificationId,
                status: 'all',
            })
            .pipe(finalize(() => this.loadingGroups.set(false)))
            .subscribe({
                next: (groups) => {
                    this.groups = groups;
                    this.loadedGroupsClassificationId = classificationId;
                    const selectedGroupId = this.selectedGroupId();
                    if (selectedGroupId !== null &&
                        !groups.some((group) => group.id === selectedGroupId)) {
                        this.clearGroupEditor();
                    }
                },
                error: (error: unknown) => {
                    console.error('Error cargando grupos homologados:', error);
                },
            });
    }
    setGroupStatusView(status: 'active' | 'inactive'): void {
        if (this.groupStatusView() === status) {
            return;
        }
        this.groupStatusView.set(status);
        this.clearGroupEditor();
    }
    selectGroup(group: entity.ExpenseReportGroup): void {
        this.selectedGroupId.set(group.id);
        this.groupCatalogForm.controls.name.setValue(group.name);
    }
    clearGroupEditor(): void {
        this.selectedGroupId.set(null);
        this.groupCatalogForm.controls.name.setValue('');
    }
    saveGroup(): void {
        if (this.savingGroup()) {
            return;
        }
        const classificationId = this.groupManagerClassificationId;
        const name = this.groupCatalogForm.controls.name.getRawValue().trim();
        if (!classificationId || !name) {
            return;
        }
        const selectedGroup = this.selectedGroup;
        this.savingGroup.set(true);
        const request$ = selectedGroup
            ? this.service.updateGroup(selectedGroup.id, { name })
            : this.service.createGroup({ classificationId, name });
        request$
            .pipe(finalize(() => this.savingGroup.set(false)))
            .subscribe({
                next: () => {
                    this.clearGroupEditor();
                    this.loadGroups(classificationId);
                },
                error: (error: unknown) => {
                    console.error('Error guardando grupo homologado:', error);
                },
            });
    }
    confirmDeactivateSelectedGroup(): void {
        const group = this.selectedGroup;
        if (!group || !group.isActive || this.savingGroup()) {
            return;
        }
        this.dialogService
            .confirm({
                title: 'Desactivar grupo',
                message: `¿Deseas desactivar "${group.name}"? ` +
                    'Solo será posible si no tiene homologaciones activas asignadas.',
                confirmText: 'Desactivar',
                cancelText: 'Cancelar',
            })
            .subscribe((confirmed: boolean) => {
                if (!confirmed) {
                    return;
                }
                this.changeSelectedGroupStatus(group, false);
            });
    }
    confirmReactivateSelectedGroup(): void {
        const group = this.selectedGroup;
        if (!group || group.isActive || this.savingGroup()) {
            return;
        }
        this.dialogService
            .confirm({
                title: 'Reactivar grupo',
                message: `¿Deseas reactivar "${group.name}"?`,
                confirmText: 'Reactivar',
                cancelText: 'Cancelar',
            })
            .subscribe((confirmed: boolean) => {
                if (!confirmed) {
                    return;
                }
                this.changeSelectedGroupStatus(group, true);
            });
    }
    private changeSelectedGroupStatus(group: entity.ExpenseReportGroup, activate: boolean): void {
        const classificationId = group.classification.id;
        this.savingGroup.set(true);
        const request$ = activate
            ? this.service.reactivateGroup(group.id)
            : this.service.deactivateGroup(group.id);
        request$
            .pipe(finalize(() => this.savingGroup.set(false)))
            .subscribe({
                next: () => {
                    this.clearGroupEditor();
                    this.loadGroups(classificationId);
                },
                error: (error: unknown) => {
                    console.error('Error cambiando estado del grupo:', error);
                },
            });
    }
    assignSelectedMappingsToGroup(): void {
        if (this.assigningGroup()) {
            return;
        }
        const selectedItems = Array.from(this.selectedMappingItems().values());
        if (!selectedItems.length) {
            return;
        }
        const classificationId = selectedItems[0].classification.id;
        if (selectedItems.some((item) => !item.isActive ||
            item.classification.id !== classificationId)) {
            return;
        }
        const groupId = toIdForm(this.groupAssignmentForm.controls.groupId.getRawValue());
        if (groupId) {
            const group = this.groups.find((item) => item.id === groupId && item.isActive);
            if (!group || group.classification.id !== classificationId) {
                return;
            }
        }
        const payload: entity.AssignExpenseReportGroupPayload = {
            groupId: groupId ?? null,
            items: selectedItems.map((item) => ({
                sourceType: item.sourceType,
                mappingId: item.mappingId,
            })),
        };
        this.assigningGroup.set(true);
        this.service
            .assignGroup(payload)
            .pipe(finalize(() => this.assigningGroup.set(false)))
            .subscribe({
                next: () => {
                    this.clearMappingSelection();
                    this.loadMappings();
                    this.loadGroups(classificationId);
                },
                error: (error: unknown) => {
                    console.error('Error asignando grupo homologado:', error);
                },
            });
    }
    // =========================================================
    // HOMOLOGADOS:
    // REACTIVAR
    // =========================================================
    private confirmReactivateMapping(mapping: ExpenseClassificationMappingSelectableRow): void {
        if (this.changingMappingStatus()) {
            return;
        }
        this.dialogService
            .confirm({
                title: 'Reactivar homologación',
                message: `¿Deseas reactivar la homologación de "${mapping.displayName}"? ` +
                    `Volverá a clasificarse como "${mapping.classification.name}" ` +
                    `y dejará de aparecer entre los pendientes por homologar.`,
                confirmText: 'Reactivar',
                cancelText: 'Cancelar',
            })
            .subscribe((confirmed: boolean) => {
                if (!confirmed) {
                    return;
                }
                this.reactivateMapping(mapping);
            });
    }
    // =========================================================
    // HOMOLOGADOS:
    // EJECUTAR REACTIVACIÓN
    // =========================================================
    private reactivateMapping(mapping: ExpenseClassificationMappingSelectableRow): void {
        const payload: entity.ChangeExpenseClassificationMappingStatusPayload = {
            sourceType: mapping.sourceType,
            mappingId: mapping.mappingId,
        };
        this.changingMappingStatus
            .set(true);
        this.service
            .reactivateMapping(payload)
            .pipe(finalize(() => this.changingMappingStatus
                .set(false)))
            .subscribe({
                next: () => {
                    this.removeMappingFromSelection(mapping);
                    /*
          
                     * Si estamos viendo Inactivos,
          
                     * la fila debe desaparecer porque
          
                     * acaba de volver a estar activa.
          
                     */
                    this.loadMappings();
                    /*
          
                     * El concepto/producto deja de ser
          
                     * pendiente porque recuperó su
          
                     * homologación anterior.
          
                     */
                    this.reloadCurrentPendingResults();
                },
                error: (error: unknown) => {
                    console.error('Error reactivando homologación:', error);
                },
            });
    }
    // =========================================================
    // HOMOLOGADOS:
    // DESACTIVAR
    // =========================================================
    private confirmDeactivateMapping(mapping: ExpenseClassificationMappingSelectableRow): void {
        if (this.changingMappingStatus()) {
            return;
        }
        this.dialogService
            .confirm({
                title: 'Desactivar homologación',
                message: `¿Deseas desactivar la homologación de "${mapping.displayName}"? ` +
                    `Dejará de clasificarse como "${mapping.classification.name}" ` +
                    `y volverá a aparecer entre los pendientes por homologar.`,
                confirmText: 'Desactivar',
                cancelText: 'Cancelar',
            })
            .subscribe((confirmed: boolean) => {
                if (!confirmed) {
                    return;
                }
                this.deactivateMapping(mapping);
            });
    }
    // =========================================================
    // HOMOLOGADOS:
    // EJECUTAR DESACTIVACIÓN
    // =========================================================
    private deactivateMapping(mapping: ExpenseClassificationMappingSelectableRow): void {
        const payload: entity.ChangeExpenseClassificationMappingStatusPayload = {
            sourceType: mapping.sourceType,
            mappingId: mapping.mappingId,
        };
        this.changingMappingStatus
            .set(true);
        this.service
            .deactivateMapping(payload)
            .pipe(finalize(() => this.changingMappingStatus
                .set(false)))
            .subscribe({
                next: () => {
                    this.removeMappingFromSelection(mapping);
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
                error: (error: unknown) => {
                    console.error('Error desactivando homologación:', error);
                },
            });
    }
    // =========================================================
    // HOMOLOGADOS:
    // REASIGNAR
    // =========================================================
    private openReassignMappingModal(mapping: ExpenseClassificationMappingSelectableRow): void {
        const classifications = this.classifications
            .filter((classification) => classification.isActive);
        if (classifications.length <= 1) {
            return;
        }
        const modalData: entity.ReassignExpenseClassificationModalData = {
            mapping,
            classifications,
        };
        this.dialogService
            .open(ModalReassignExpenseClassification, modalData, 'medium')
            .afterClosed()
            .subscribe((changed: boolean | null) => {
                if (!changed) {
                    return;
                }
                this.removeMappingFromSelection(mapping);
                /*
                 * Reconsultamos porque si hay filtros
                 * por clasificación, la fila podría
                 * incluso dejar de pertenecer a la vista.
                 */
                this.loadMappings();
            });
    }
    private resolveSourceType(value: Catalog | string | null): entity.ExpenseClassificationSourceType | undefined {
        const raw = typeof value ===
            'object'
            ? value?.id
            : value;
        if (raw === 'concept' ||
            raw === 'product') {
            return raw;
        }
        return undefined;
    }
    private resolveStatus(value: Catalog | string | null): entity.ExpenseClassificationStatusFilter {
        const raw = typeof value ===
            'object'
            ? value?.id
            : value;
        if (raw === 'inactive' ||
            raw === 'all') {
            return raw;
        }
        return 'active';
    }
    // =========================================================
    // ESTADO DE FILTROS
    // =========================================================
    get hasActivePendingFilters(): boolean {
        const value = this.pendingFilterForm
            .getRawValue();
        return Boolean(value.search.trim() ||
            this.resolveSourceType(value.sourceType) ||
            this.pendingSorts.length > 0);
    }
    get hasActiveMappingFilters(): boolean {
        const value = this.mappingFilterForm
            .getRawValue();
        return Boolean(value.search.trim() ||
            this.resolveSourceType(value.sourceType) ||
            this.resolveStatus(value.status) !== 'active' ||
            toIdForm(value.classificationId) ||
            this.mappingSorts.length > 0);
    }
    // =========================================================
    // BTN SECTIONS
    // =========================================================
    onPendingBtnsSectionAction(action: string): void {
        switch (action) {
            case 'search':
                this.applyPendingFilters();
                break;
            case 'clean':
                this.clearPendingFilters();
                break;
        }
    }
    onMappingBtnsSectionAction(action: string): void {
        switch (action) {
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
    classifySelectedPending(): void {
        if (this.classifyingPending()) {
            return;
        }
        const classificationId = this.selectedClassificationId();
        if (!classificationId ||
            !this.selectedClassificationIsActive) {
            return;
        }
        const selectedItems = Array.from(this.selectedPendingItems()
            .values());
        if (selectedItems.length === 0) {
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
        const items: entity.ExpenseClassificationSelection[] = selectedItems
            .map((item): entity.ExpenseClassificationSelection => {
                if (item.sourceType ===
                    'concept') {
                    return {
                        sourceType: 'concept',
                        conceptName: item.displayName,
                    };
                }
                return {
                    sourceType: 'product',
                    productId: item.productId,
                };
            });
        const payload: entity.BulkClassifyExpensePendingPayload = {
            classificationId,
            items,
        };
        this.classifyingPending
            .set(true);
        this.service
            .classifyPending(payload)
            .pipe(finalize(() => this.classifyingPending
                .set(false)))
            .subscribe({
                next: (response: entity.BulkClassifyExpensePendingResponse) => {
                    if (!response?.success) {
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
                error: (error: unknown) => {
                    console.error('Error homologando conceptos de gasto:', error);
                },
            });
    }
    // =========================================================
    // PENDIENTES:
    // RECARGAR FILTRO ACTUAL
    // =========================================================
    private reloadCurrentPendingResults(): void {
        const form = this.pendingFilterForm
            .getRawValue();
        this.loadPending({
            search: form.search
                .trim(),
            sourceType: this.resolveSourceType(form.sourceType),
            sorts: [
                ...this.pendingSorts,
            ],
        });
    }
    // =========================================================
    // PENDIENTES:
    // ORDENAMIENTO
    // =========================================================
    onPendingSortChange(event: DataTableSortEvent): void {
        this.pendingSorts = [
            ...event.sorts,
        ];
        const form = this.pendingFilterForm
            .getRawValue();
        this.loadPending({
            search: form.search.trim(),
            sourceType: this.resolveSourceType(form.sourceType),
            sorts: [
                ...this.pendingSorts,
            ],
        });
    }
    // =========================================================
    // HOMOLOGADOS:
    // ORDENAMIENTO
    // =========================================================
    onMappingSortChange(event: DataTableSortEvent): void {
        this.mappingSorts = [
            ...event.sorts,
        ];
        this.mappingFilters = {
            ...this.mappingFilters,
            page: 1,
            sorts: [
                ...this.mappingSorts,
            ],
        };
        this.loadMappings();
    }
}
