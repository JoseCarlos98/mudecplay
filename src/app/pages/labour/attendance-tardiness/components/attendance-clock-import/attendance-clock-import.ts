import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { concatMap, finalize, forkJoin, from, of, switchMap, tap, toArray } from 'rxjs';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';
import { DataTable } from '../../../../../shared/ui/data-table/data-table';
import { ColumnsConfig, DataTableActionEvent, DataTableExtraAction } from '../../../../../shared/ui/data-table/interfaces/table-interfaces';
import { InputSelect, SelectCatalogOption } from '../../../../../shared/ui/input-select/input-select';
import { EmployeesService } from '../../../employees/services/employees.service';
import { DialogService } from '../../../../../shared/services/dialog.service';
import { ModalClockDecision, ClockDecisionModalResult } from './components/modal-clock-decision/modal-clock-decision';
import { AttendanceClockImportService } from './services/attendance-clock-import.service';
import {
  ClockEmployeeMapping,
  ClockImportPreviewResponse,
  ClockStagedRow,
  ClockStagedRowsResult,
  ClockStagedTableRow,
  ClockWorkerGroup,
  ClockApplyPreflightResult,
  ClockBulkResult,
  ClockImportHistoryResult,
} from './interfaces/attendance-clock-import.interfaces';

const MAX_EXCEL_BYTES = 10 * 1024 * 1024;
const HEADER_CONFIG: ModuleHeaderConfig = { formFull: true, showNew: false, showUploadXml: false };

const STAGED_COLUMNS: ColumnsConfig[] = [
  { key: 'row_index', label: '#', align: 'center' },
  { key: 'worker_label', label: 'Trabajador del reloj' },
  { key: 'employee_label', label: 'Empleado MUDECPLAY' },
  { key: 'work_date', label: 'Fecha', type: 'date' },
  { key: 'marks_label', label: 'Marcajes' },
  { key: 'review_label', label: 'Resultado revisión' },
  { key: 'status_label', label: 'Estado', type: 'chip', typeVariant: 'chip-neutral' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  conflict: 'Bloqueado',
  ready: 'Aprobado, sin aplicar',
  applied: 'Aplicado',
  skipped: 'Omitido',
  error: 'Error',
};

@Component({
  selector: 'app-attendance-clock-import',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModuleHeader,
    LoadingOverlay,
    MatIconModule,
    MatPaginatorModule,
    DataTable,
    InputSelect,
  ],
  templateUrl: './attendance-clock-import.html',
  styleUrl: './attendance-clock-import.scss',
})
export class AttendanceClockImport implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly importService = inject(AttendanceClockImportService);
  private readonly employeesService = inject(EmployeesService);
  private readonly dialogService = inject(DialogService);

  @ViewChild('excelInput') private excelInput?: ElementRef<HTMLInputElement>;

  readonly headerConfig = HEADER_CONFIG;
  readonly tableColumns = STAGED_COLUMNS;
  readonly displayedColumns = [...STAGED_COLUMNS.map((item) => item.key), 'actions'];
  readonly loading = signal(false);
  readonly loadingCatalog = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly preview = signal<ClockImportPreviewResponse | null>(null);
  readonly staged = signal<ClockStagedRowsResult | null>(null);
  readonly allImportRows = signal<ClockStagedRow[]>([]);
  readonly activeImportId = signal<number | null>(null);
  readonly importHistory = signal<ClockImportHistoryResult | null>(null);
  readonly loadingHistory = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly duplicateImportId = signal<number | null>(null);
  readonly pageMode = signal<'load' | 'review'>('load');
  readonly errorMessage = signal<string | null>(null);
  readonly noticeMessage = signal<string | null>(null);
  readonly employeeOptions = signal<SelectCatalogOption[]>([]);
  readonly mappings = signal<ClockEmployeeMapping[]>([]);
  readonly savingClockNumber = signal<string | null>(null);

  /** Selección explícita solo sobre las filas visibles de la página actual. */
  readonly bulkMode = signal<'approve' | 'apply'>('approve');
  readonly bulkSelectedIds = signal<number[]>([]);

  readonly bulkCandidates = computed(() =>
    this.tableRows().filter((row) => this.isBulkCandidate(row, this.bulkMode())),
  );
  readonly bulkSelectedRows = computed(() => {
    const ids = new Set(this.bulkSelectedIds());
    return this.bulkCandidates().filter((row) => ids.has(row.id));
  });
  readonly allBulkSelected = computed(() =>
    this.bulkCandidates().length > 0 &&
    this.bulkSelectedRows().length === this.bulkCandidates().length,
  );


  /** Controles identificados por el número físico del reloj. No se recrean con cada render. */
  private readonly mappingControls = new Map<string, FormControl<number | null>>();

  readonly workers = computed<ClockWorkerGroup[]>(() => {
    const data = this.preview()?.rows ?? (this.allImportRows().length ? this.allImportRows() : (this.staged()?.rows ?? []));
    const grouped = new Map<string, ClockWorkerGroup>();
    for (const row of data) {
      const number = row.clock_employee_number;
      if (!number) continue;
      const current = grouped.get(number);
      if (current) {
        current.records++;
        continue;
      }
      const mapped = this.mappings().find((item) => item.clock_employee_number === number);
      // El ID guardado en staging puede estar desactualizado después de una
      // desvinculación: mostrar SIEMPRE la vinculación actual del reloj.
      grouped.set(number, {
        clock_employee_number: number,
        clock_employee_name: row.clock_employee_name ?? '',
        clock_department: 'clock_department' in row ? (row.clock_department ?? '')
          : (row.issues?.clock_department ?? '').toString(),
        records: 1,
        employee_id: mapped?.employee_id ?? null,
        employee_name: mapped?.employee_name ?? null,
      });
    }
    return [...grouped.values()].sort((a, b) =>
      a.clock_employee_number.localeCompare(b.clock_employee_number, 'es', { numeric: true }),
    );
  });

  readonly tableRows = computed<ClockStagedTableRow[]>(() => {
    const mappings = this.mappings();
    const employees = this.employeeOptions();
    return (this.staged()?.rows ?? []).map((row) => {
      const mapping = mappings.find((item) => item.clock_employee_number === row.clock_employee_number);
      const employee = employees.find((item) => item.id === row.employee_id);
      return {
        ...row,
        worker_label: `${row.clock_employee_number ?? '—'} · ${row.clock_employee_name ?? 'Sin nombre'}`,
        employee_label: row.employee_id === null ? 'Sin vincular'
          : mapping?.employee_id !== row.employee_id ? 'Vinculación desactualizada (reconciliar)'
          : (mapping.employee_name ?? employee?.name ?? `Empleado #${row.employee_id}`),
        marks_label: row.original_marks?.join(', ') || 'Sin marcajes',
        review_label: row.issues?.review_message ?? 'Sin observaciones',
        status_label: STATUS_LABELS[row.status] ?? row.status,
      };
    });
  });

  /** Únicamente llegadas estándar no dominicales, con dos marcajes inequívocos. */
  private isBulkCandidate(row: ClockStagedTableRow, mode: 'approve' | 'apply'): boolean {
    const issues = row.issues;
    const standard = issues?.review_status === 'ready_for_approval' &&
      (issues.review_code === 'new_arrival' || issues.review_code === 'existing_attendance_without_arrival');
    const marks = row.original_marks ?? [];
    const clearArrival = marks.length === 2 && !!row.original_arrival_time &&
      marks[0] === row.original_arrival_time;
    const isSunday = !!row.work_date && new Date(`${row.work_date}T00:00:00Z`).getUTCDay() === 0;
    const linked = row.employee_id !== null && !!row.clock_employee_number &&
      this.mappings().some((mapping) =>
        mapping.clock_employee_number === row.clock_employee_number &&
        mapping.employee_id === row.employee_id);

    if (!standard || !clearArrival || isSunday || !linked || !!row.processed_at) return false;
    return mode === 'approve'
      ? (row.status === 'pending' || row.status === 'conflict') && row.decision === null
      : row.status === 'ready' && row.decision === 'import_arrival';
  }

  selectBulkMode(mode: 'approve' | 'apply'): void {
    if (this.loading()) return;
    this.bulkMode.set(mode);
    this.bulkSelectedIds.set([]);
  }

  toggleBulkRow(rowId: number, checked: boolean): void {
    if (this.loading() || !this.bulkCandidates().some((row) => row.id === rowId)) return;
    this.bulkSelectedIds.update((previous) => checked
      ? [...new Set([...previous, rowId])]
      : previous.filter((id) => id !== rowId));
  }

  selectAllBulkCandidates(): void {
    if (this.loading()) return;
    this.bulkSelectedIds.set(this.allBulkSelected() ? [] : this.bulkCandidates().map((row) => row.id));
  }

  /** La aprobación puede dejar decisiones guardadas; nunca escribe asistencias. */
  approveSelectedBulk(): void {
    if (this.bulkMode() !== 'approve' || this.loading()) return;
    const rows = this.bulkSelectedRows();
    if (!rows.length) return;
    this.dialogService.confirm({
      title: rows.length === 1 ? 'Aprobar llegada seleccionada' : 'Aprobar llegadas seleccionadas',
      message: `¿Aprobar ${rows.length} ${rows.length === 1 ? 'llegada clara' : 'llegadas claras'} de esta página? Se guardarán decisiones, sin modificar asistencias. Las faltas y los marcajes ambiguos quedan excluidos.`,
      confirmText: rows.length === 1 ? 'Aprobar llegada' : 'Aprobar llegadas',
      cancelText: 'Cancelar',
    }).subscribe((confirmed) => {
      if (confirmed) this.executeBulk('approve', rows.map((row) => row.id));
    });
  }

  /** Antes de aplicar, prevalidar TODOS los IDs elegidos y pedir confirmación. */
  prevalidateSelectedBulk(): void {
    if (this.bulkMode() !== 'apply' || this.loading()) return;
    const rows = this.bulkSelectedRows();
    const importId = this.activeImportId();
    if (!importId || !rows.length) return;
    const ids = rows.map((row) => row.id);
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.loading.set(true);
    this.importService.getApplyPreview(importId).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (preflight) => {
        const checked = new Map(preflight.rows.map((row) => [row.row_id, row]));
        const blocked = rows.filter((row) => checked.get(row.id)?.readiness !== 'eligible');
        if (blocked.length) {
          const example = checked.get(blocked[0].id)?.reason ?? 'Necesita revisión.';
          this.errorMessage.set(`${blocked.length} ${blocked.length === 1 ? 'registro dejó' : 'registros dejaron'} de estar ${blocked.length === 1 ? 'listo' : 'listos'} para aplicar. ${example} No se aplicó ningún registro.`);
          return;
        }
        this.dialogService.confirm({
          title: 'Confirmar aplicación en lote',
          message: `¿Aplicar ${ids.length} ${ids.length === 1 ? 'llegada aprobada' : 'llegadas aprobadas'} de esta página? Se crearán o actualizarán asistencias, con nueva validación por registro. Esta operación NO puede deshacerse desde el importador.`,
          confirmText: 'Aplicar asistencias',
          cancelText: 'Cancelar',
        }).subscribe((confirmed) => {
          if (confirmed) this.executeBulk('apply', ids);
        });
      },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
    });
  }

  /** Angular divide automáticamente en grupos de hasta 25; nunca reintenta filas rechazadas. */
  private executeBulk(kind: 'approve' | 'apply', rowIds: number[]): void {
    const importId = this.activeImportId();
    if (!importId || this.loading() || !rowIds.length) return;
    const stillEligible = new Set(this.bulkCandidates().map((row) => row.id));
    if (this.bulkMode() !== kind || rowIds.some((id) => !stillEligible.has(id))) {
      this.errorMessage.set('La selección cambió. Vuelve a seleccionar los registros.');
      this.bulkSelectedIds.set([]);
      return;
    }
    const chunks: number[][] = [];
    for (let index = 0; index < rowIds.length; index += 25) {
      chunks.push(rowIds.slice(index, index + 25));
    }
    const page = this.staged()?.page ?? 1;
    const limit = this.staged()?.limit ?? 20;
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.loading.set(true);
    from(chunks).pipe(
      concatMap((chunk) => kind === 'approve'
        ? this.importService.bulkApproveArrivals(importId, chunk)
        : this.importService.bulkApplyArrivals(importId, chunk)),
      toArray(),
      switchMap((results: ClockBulkResult[]) => {
        const successful = results.reduce((sum, result) =>
          sum + (kind === 'approve' ? result.approved_rows ?? 0 : result.applied_rows ?? 0), 0);
        const blocked = results.flatMap((result) => result.blocked ?? []);
        const resultLabel = kind === 'approve' ? 'aprobada' : 'aplicada';
        this.noticeMessage.set(
          `${successful} ${successful === 1 ? 'llegada' : 'llegadas'} ${successful === 1 ? resultLabel : `${resultLabel}s`}. ` +
          `${blocked.length} ${blocked.length === 1 ? 'registro bloqueado' : 'registros bloqueados'}.`,
        );
        if (blocked.length) {
          this.errorMessage.set(blocked.slice(0, 3).map((item) =>
            `Fila ${item.row_id}: ${item.reason}`).join(' | '));
        }
        return this.importService.getRows(importId, page, limit);
      }),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (result) => {
        this.bulkSelectedIds.set([]);
        this.setStagedResult(result);
      },
      error: (err: HttpErrorResponse) => {
        this.bulkSelectedIds.set([]);
        this.errorMessage.set(`No se completó el lote: ${this.errorText(err)}. Algunas filas podrían haberse procesado; recarga el lote para verificar sus estados antes de intentar nuevamente.`);
      },
    });
  }

  /** Solo se puede decidir una fila sin decisión previa y sin procesar. */
  readonly canReviewDecision = (row: ClockStagedTableRow): boolean =>
    (row.status === 'pending' || row.status === 'conflict') &&
    row.decision === null && !row.processed_at &&
    row.clock_employee_number !== null &&
    this.loading() === false;

  readonly canApplyDecision = (row: ClockStagedTableRow): boolean =>
    row.status === 'ready' &&
    (row.decision === 'import_arrival' || row.decision === 'confirm_absence') &&
    !row.processed_at && !this.loading();

  readonly rowExtraActions: DataTableExtraAction<ClockStagedTableRow>[] = [
    {
      type: 'reviewDecision', icon: 'fact_check',
      tooltip: (row) => this.canReviewDecision(row) ? 'Revisar y decidir' : 'Registro sin decisión disponible',
      visible: () => true,
      disabled: (row) => !this.canReviewDecision(row),
    },
    {
      type: 'applyDecision', icon: 'task_alt',
      tooltip: (row) => this.canApplyDecision(row) ? 'Prevalidar y aplicar asistencia' : 'Requiere decisión aprobada',
      visible: () => true,
      disabled: (row) => !this.canApplyDecision(row),
    },
  ];

  onTableAction(event: DataTableActionEvent<ClockStagedTableRow>): void {
    if (event.type === 'reviewDecision') this.openDecisionModal(event.row);
    if (event.type === 'applyDecision') this.prevalidateAndApply(event.row);
  }

  private openDecisionModal(row: ClockStagedTableRow): void {
    if (!this.canReviewDecision(row)) return;
    // Nunca permitir una decisión sobre una foto histórica de una vinculación.
    // Sí se permite omitir, pero evitamos mezclar acciones hasta reconciliar.
    const mapping = this.mappings().find((item) => item.clock_employee_number === row.clock_employee_number);
    if (row.employee_id !== null && mapping?.employee_id !== row.employee_id) {
      this.errorMessage.set('La vinculación actual no coincide con esta fila. Actualiza la revisión antes de decidir.');
      return;
    }
    this.dialogService.open(ModalClockDecision, { row }, 'medium')
      .afterClosed()
      .subscribe((result: ClockDecisionModalResult | null) => {
        if (!result || result.action !== 'save') return;
        this.saveRowDecision(row.id, result.payload);
      });
  }

  private saveRowDecision(rowId: number, payload: ClockDecisionModalResult['payload']): void {
    const importId = this.activeImportId();
    if (!importId || this.loading()) return;
    const page = this.staged()?.page ?? 1;
    const limit = this.staged()?.limit ?? 20;
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.loading.set(true);
    this.importService.saveDecision(importId, rowId, payload).pipe(
      tap((result) => this.noticeMessage.set(result.message)),
      switchMap(() => this.importService.getRows(importId, page, limit)),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (batch) => this.setStagedResult(batch),
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
    });
  }

  /** Prevalidación informativa seguida de confirmación humana y aplicación individual. */
  private prevalidateAndApply(row: ClockStagedTableRow): void {
    const importId = this.activeImportId();
    if (!importId || !this.canApplyDecision(row)) return;
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.loading.set(true);
    this.importService.getApplyPreview(importId).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (preflight: ClockApplyPreflightResult) => {
        const status = preflight.rows.find((item) => item.row_id === row.id);
        if (!status || status.readiness !== 'eligible') {
          this.errorMessage.set(status?.reason ?? 'Esta decisión no está autorizada para aplicarse. Actualiza la revisión.');
          return;
        }
        const type = row.decision === 'confirm_absence' ? 'una falta' : 'una llegada';
        this.dialogService.confirm({
          title: 'Confirmar aplicación',
          message: `¿Aplicar ${type} del ${row.work_date} a ${row.employee_label}? Esta operación modificará la asistencia en DEV.`,
          confirmText: 'Aplicar asistencia',
          cancelText: 'Cancelar',
        }).subscribe((confirmed) => {
          if (confirmed) this.applyRowDecision(row.id);
        });
      },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
    });
  }

  private applyRowDecision(rowId: number): void {
    const importId = this.activeImportId();
    if (!importId || this.loading()) return;
    const page = this.staged()?.page ?? 1;
    const limit = this.staged()?.limit ?? 20;
    this.loading.set(true);
    this.importService.applyDecision(importId, rowId).pipe(
      tap((result) => this.noticeMessage.set(`Asistencia #${result.attendance_id} aplicada. ${result.message}`)),
      switchMap(() => this.importService.getRows(importId, page, limit)),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (batch) => this.setStagedResult(batch),
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
    });
  }

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadHistory(1, 10);
  }

  /** Historial paginado de solo lectura, independiente del procesamiento de asistencias. */
  loadHistory(page: number, limit: number): void {
    if (this.loadingHistory()) return;
    this.historyError.set(null);
    this.loadingHistory.set(true);
    this.importService.getHistory(page, limit)
      .pipe(finalize(() => this.loadingHistory.set(false)))
      .subscribe({
        next: (result) => this.importHistory.set(result),
        error: (err: HttpErrorResponse) => this.historyError.set(this.errorText(err)),
      });
  }

  onHistoryPageChange(event: PageEvent): void {
    this.loadHistory(event.pageIndex + 1, event.pageSize);
  }

  refreshHistory(): void {
    this.loadHistory(this.importHistory()?.page ?? 1, this.importHistory()?.limit ?? 10);
  }

  importStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      processing: 'En revisión',
      completed: 'Completada',
      partial: 'Parcial',
      failed: 'Fallida',
    };
    return labels[status] ?? status;
  }

  private loadCatalogs(): void {
    this.loadingCatalog.set(true);
    forkJoin({
      employees: this.employeesService.getCatalog(),
      mappings: this.importService.getMappings(),
    }).pipe(finalize(() => this.loadingCatalog.set(false))).subscribe({
      next: ({ employees, mappings }) => {
        this.employeeOptions.set(employees ?? []);
        this.mappings.set(mappings ?? []);
      },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
    });
  }

  onHeaderAction(action: string): void {
    if (action === 'back') this.goBack();
  }

  goBack(): void {
    void this.router.navigate(['llegadas-retardos'], {
      relativeTo: this.route.parent ?? this.route,
    });
  }

  selectLoad(): void {
    if (this.loading()) return;
    this.pageMode.set('load');
    this.bulkSelectedIds.set([]);
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.refreshHistory();
  }

  selectReview(): void {
    if (!this.activeImportId()) return;
    this.pageMode.set('review');
    this.bulkSelectedIds.set([]);
    this.errorMessage.set(null);
  }

  openFilePicker(): void {
    if (!this.loading()) this.excelInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    input.value = '';
    if (!file || this.loading()) return;

    this.preview.set(null);
    this.staged.set(null);
    this.allImportRows.set([]);
    this.activeImportId.set(null);
    this.duplicateImportId.set(null);
    this.mappingControls.clear();
    this.bulkSelectedIds.set([]);
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.selectedFile.set(file);

    if (!file.name.toLowerCase().endsWith('.xls')) {
      this.errorMessage.set('Selecciona un archivo de reloj checador con extensión .xls.');
      return;
    }
    if (file.size === 0 || file.size > MAX_EXCEL_BYTES) {
      this.errorMessage.set('El Excel debe tener contenido y no superar 10 MB.');
      return;
    }
    this.refreshPreview(file);
  }

  private refreshPreview(file: File): void {
    this.loading.set(true);
    this.importService.preview(file)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.preview.set(result);
          this.prepareMappingControls();
        },
        error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
      });
  }

  private prepareMappingControls(): void {
    for (const worker of this.workers()) {
      if (!this.mappingControls.has(worker.clock_employee_number)) {
        this.mappingControls.set(worker.clock_employee_number, new FormControl<number | null>(null));
      }
    }
  }

  controlFor(clockNumber: string): FormControl<number | null> {
    // Los controles se preparan al recibir el preview o la página de registros.
    return this.mappingControls.get(clockNumber)!;
  }

  /**
   * Guarda la vinculación, actualiza los mappings y reconcilia el lote activo.
   * La reconciliación solo reclasifica filas sin decisión; NO aplica asistencias.
   */
  saveMapping(worker: ClockWorkerGroup): void {
    if (this.loading() || this.savingClockNumber() || worker.employee_id !== null) return;
    const employeeId = Number(this.controlFor(worker.clock_employee_number).value);
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      this.errorMessage.set('Selecciona un empleado válido de MUDECPLAY.');
      return;
    }
    const catalogEmployee = this.employeeOptions().find((item) => Number(item.id) === employeeId);
    if (!catalogEmployee) {
      this.errorMessage.set('El empleado seleccionado no está en el catálogo actual.');
      return;
    }

    // Priorizar staging cuando se trabaja con un lote ya guardado, incluso
    // si el Excel seleccionado continúa presente tras guardar la importación.
    const importId = this.pageMode() === 'review' ? this.activeImportId() : null;
    const page = this.staged()?.page ?? 1;
    const limit = this.staged()?.limit ?? 20;
    let mappingSaved = false;

    this.savingClockNumber.set(worker.clock_employee_number);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.noticeMessage.set(null);

    this.importService.saveMapping(employeeId, worker.clock_employee_number).pipe(
      tap(() => {
        mappingSaved = true;
        this.noticeMessage.set(`Vinculación de ${worker.clock_employee_name} con ${catalogEmployee.name} guardada.`);
      }),
      switchMap(() => this.importService.getMappings()),
      tap((mappings) => this.mappings.set(mappings ?? [])),
      switchMap(() => {
        if (importId !== null) {
          return this.importService.reconcile(importId).pipe(
            tap((result) => this.noticeMessage.set(
              `Vinculación guardada. Revisión actualizada automáticamente: ${result.changed_rows} filas recalculadas.`,
            )),
            switchMap(() => this.importService.getRows(importId, page, limit)),
            tap((result) => {
              if (this.activeImportId() === importId) this.setStagedResult(result);
            }),
          );
        }

        // Antes de guardar el Excel todavía no existe un staging que reconciliar.
        // Se actualiza únicamente la vista previa con la vinculación nueva.
        const file = this.selectedFile();
        if (file) {
          return this.importService.preview(file).pipe(
            tap((result) => {
              this.preview.set(result);
              this.prepareMappingControls();
            }),
          );
        }
        return of(null);
      }),
      finalize(() => {
        this.savingClockNumber.set(null);
        this.loading.set(false);
      }),
    ).subscribe({
      error: (err: HttpErrorResponse) => this.errorMessage.set(mappingSaved
        ? `La vinculación se guardó, pero no se pudo actualizar la revisión automáticamente. ${this.errorText(err)} Usa «Actualizar revisión» para reintentar.`
        : this.errorText(err)),
    });
  }

  /** Guarda solo staging; nunca aplica llegadas ni descuentos. */
  stageImport(): void {
    const file = this.selectedFile();
    if (!file || !this.preview() || this.loading()) return;
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.duplicateImportId.set(null);
    this.loading.set(true);
    this.importService.stage(file)
      .pipe(
        switchMap((result) => {
          this.activeImportId.set(result.import_id);
          this.noticeMessage.set(result.message);
          return this.importService.getRows(result.import_id, 1, 20);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => this.setStagedResult(result),
        error: (err: HttpErrorResponse) => {
          const message = this.errorText(err);
          if (err.status === 409) {
            const found = /importaci[oó]n\s+(\d+)/i.exec(message);
            if (found) {
              this.duplicateImportId.set(Number(found[1]));
              this.noticeMessage.set('Este archivo ya tiene una importación guardada. Puedes continuarla sin duplicar registros.');
              return;
            }
          }
          this.errorMessage.set(message);
        },
      });
  }

  openExistingImport(importId: number): void {
    if (!Number.isSafeInteger(importId) || importId <= 0) {
      this.errorMessage.set('La importación seleccionada no es válida.');
      return;
    }
    this.duplicateImportId.set(null);
    // Al reabrir un lote, su staging es la fuente de datos, no otro Excel
    // que pudiera estar seleccionado en esta misma sesión.
    this.preview.set(null);
    this.selectedFile.set(null);
    this.allImportRows.set([]);
    this.mappingControls.clear();
    this.bulkSelectedIds.set([]);
    this.activeImportId.set(importId);
    this.loadReviewPage(1, 20);
  }

  onPageChange(event: PageEvent): void {
    this.bulkSelectedIds.set([]);
    this.loadReviewPage(event.pageIndex + 1, event.pageSize);
  }

  private loadReviewPage(page: number, limit: number): void {
    const importId = this.activeImportId();
    if (!importId || this.loading()) return;
    this.errorMessage.set(null);
    this.loading.set(true);
    this.importService.getRows(importId, page, limit)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.setStagedResult(result);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(this.errorText(err));
          this.activeImportId.set(null);
          this.pageMode.set('load');
        },
      });
  }

  private setStagedResult(result: ClockStagedRowsResult): void {
    // Si se abrió un lote distinto al Excel seleccionado, no mezclar trabajadores.
    if (this.selectedFile() && this.selectedFile()!.name !== result.file_name) {
      this.selectedFile.set(null);
      this.preview.set(null);
      this.allImportRows.set([]);
      this.mappingControls.clear();
    }
    this.staged.set(result);
    this.bulkSelectedIds.set([]);
    this.pageMode.set('review');
    this.prepareMappingControls();
    // Para un lote reabierto sin Excel, recuperar los trabajadores de todas
    // las páginas. Mantiene el listado completo sin volver a subir el archivo.
    if (!this.preview() && this.allImportRows().length === 0) {
      this.loadAllWorkerRows(result);
    }
  }

  private loadAllWorkerRows(batch: ClockStagedRowsResult): void {
    const pages = Math.ceil(batch.total / 100);
    // Cota defensiva: el historial paginado seguirá disponible si es enorme.
    if (pages > 20) return;
    this.importService.getRows(batch.import_id, 1, 100).subscribe({
      next: (first) => {
        const remaining = Array.from({ length: pages - 1 }, (_, index) => index + 2);
        if (!remaining.length) {
          this.setAllWorkerRows(batch.import_id, first.rows);
          return;
        }
        forkJoin(remaining.map((page) => this.importService.getRows(batch.import_id, page, 100)))
          .subscribe({
            next: (rest) => this.setAllWorkerRows(batch.import_id,
              [...first.rows, ...rest.flatMap((item) => item.rows)]),
            error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
          });
      },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
    });
  }

  private setAllWorkerRows(importId: number, rows: ClockStagedRow[]): void {
    if (this.activeImportId() !== importId) return;
    this.allImportRows.set(rows);
    this.prepareMappingControls();
  }

  /** Revalida filas sin decisión. NO modifica employee_attendances. */
  reconcileImport(): void {
    const importId = this.activeImportId();
    if (!importId || this.loading()) return;
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.loading.set(true);
    const page = this.staged()?.page ?? 1;
    const limit = this.staged()?.limit ?? 20;
    this.importService.reconcile(importId)
      .pipe(
        tap((result) => {
          this.noticeMessage.set(`${result.message} Filas actualizadas: ${result.changed_rows}.`);
        }),
        switchMap(() => this.importService.getRows(importId, page, limit)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => this.setStagedResult(result),
        error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
      });
  }

  formatApiDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  formatFileSize(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  private errorText(error: HttpErrorResponse): string {
    const message: unknown = error.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (Array.isArray(message)) {
      const strings = message.filter((item): item is string => typeof item === 'string');
      if (strings.length) return strings.join(' ');
    }
    return 'No se pudo completar la operación. Revisa la conexión e inténtalo de nuevo.';
  }
}
