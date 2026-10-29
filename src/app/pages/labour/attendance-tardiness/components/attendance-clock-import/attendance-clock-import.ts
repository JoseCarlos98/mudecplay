import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize, forkJoin, switchMap, tap } from 'rxjs';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';
import { DataTable } from '../../../../../shared/ui/data-table/data-table';
import { ColumnsConfig } from '../../../../../shared/ui/data-table/interfaces/table-interfaces';
import { InputSelect, SelectCatalogOption } from '../../../../../shared/ui/input-select/input-select';
import { EmployeesService } from '../../../employees/services/employees.service';
import { AttendanceClockImportService } from './services/attendance-clock-import.service';
import { ClockEmployeeMapping, ClockImportPreviewResponse, ClockStagedRow, ClockStagedRowsResult, ClockStagedTableRow, ClockWorkerGroup } from './interfaces/attendance-clock-import.interfaces';

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

  @ViewChild('excelInput') private excelInput?: ElementRef<HTMLInputElement>;

  readonly headerConfig = HEADER_CONFIG;
  readonly tableColumns = STAGED_COLUMNS;
  readonly displayedColumns = STAGED_COLUMNS.map((item) => item.key);
  readonly loading = signal(false);
  readonly loadingCatalog = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly preview = signal<ClockImportPreviewResponse | null>(null);
  readonly staged = signal<ClockStagedRowsResult | null>(null);
  readonly allImportRows = signal<ClockStagedRow[]>([]);
  readonly activeImportId = signal<number | null>(null);
  readonly existingImportId = signal('');
  readonly duplicateImportId = signal<number | null>(null);
  readonly pageMode = signal<'load' | 'review'>('load');
  readonly errorMessage = signal<string | null>(null);
  readonly noticeMessage = signal<string | null>(null);
  readonly employeeOptions = signal<SelectCatalogOption[]>([]);
  readonly mappings = signal<ClockEmployeeMapping[]>([]);
  readonly savingClockNumber = signal<string | null>(null);

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
      grouped.set(number, {
        clock_employee_number: number,
        clock_employee_name: row.clock_employee_name ?? '',
        clock_department: 'clock_department' in row ? (row.clock_department ?? '')
          : (row.issues?.clock_department ?? '').toString(),
        records: 1,
        employee_id: row.employee_id ?? mapped?.employee_id ?? null,
        employee_name: 'employee_name' in row ? (row.employee_name ?? mapped?.employee_name ?? null)
          : mapped?.employee_name ?? null,
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
          : (mapping?.employee_name ?? employee?.name ?? `Empleado #${row.employee_id}`),
        marks_label: row.original_marks?.join(', ') || 'Sin marcajes',
        review_label: row.issues?.review_message ?? 'Sin observaciones',
        status_label: STATUS_LABELS[row.status] ?? row.status,
      };
    });
  });

  ngOnInit(): void {
    this.loadCatalogs();
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
    this.pageMode.set('load');
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
  }

  selectReview(): void {
    if (!this.activeImportId()) return;
    this.pageMode.set('review');
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
    this.savingClockNumber.set(worker.clock_employee_number);
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.importService.saveMapping(employeeId, worker.clock_employee_number)
      .pipe(finalize(() => this.savingClockNumber.set(null)))
      .subscribe({
        next: () => {
          this.noticeMessage.set(`Vinculación de ${worker.clock_employee_name} con ${catalogEmployee.name} guardada.`);
          this.importService.getMappings().subscribe({
            next: (mappings) => {
              this.mappings.set(mappings ?? []);
              if (this.selectedFile()) {
                this.refreshPreview(this.selectedFile()!);
              } else if (this.activeImportId()) {
                this.prepareMappingControls();
              }
            },
            error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
          });
        },
        error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorText(err)),
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
          this.existingImportId.set(String(result.import_id));
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
              this.existingImportId.set(found[1]);
              this.noticeMessage.set('Este archivo ya tiene una importación guardada. Puedes continuarla sin duplicar registros.');
              return;
            }
          }
          this.errorMessage.set(message);
        },
      });
  }

  onExistingImportIdInput(event: Event): void {
    this.existingImportId.set((event.target as HTMLInputElement).value);
  }

  openExistingImport(id?: number): void {
    const importId = id ?? Number(this.existingImportId());
    if (!Number.isSafeInteger(importId) || importId <= 0) {
      this.errorMessage.set('Escribe un ID de importación válido.');
      return;
    }
    this.duplicateImportId.set(null);
    // Al reabrir un lote, su staging es la fuente de datos, no otro Excel
    // que pudiera estar seleccionado en esta misma sesión.
    this.preview.set(null);
    this.selectedFile.set(null);
    this.allImportRows.set([]);
    this.mappingControls.clear();
    this.activeImportId.set(importId);
    this.loadReviewPage(1, 20);
  }

  onPageChange(event: PageEvent): void {
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
    this.pageMode.set('review');
    this.prepareMappingControls();
    this.existingImportId.set(String(result.import_id));
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
