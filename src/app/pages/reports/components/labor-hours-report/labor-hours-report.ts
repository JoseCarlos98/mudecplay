import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize, Subscription } from 'rxjs';
import { MatIcon } from '@angular/material/icon';

import { DateRangeValue, InputDate } from '../../../../shared/ui/input-date/input-date';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { toApiDate } from '../../../../shared/helpers/general-helpers';
import { ReportsApiService } from '../../services/reports-api.service';
import { LaborHoursReportFilters } from '../../interfaces/reports-interfaces';
import { EmployeesService } from '../../../labour/employees/services/employees.service';

@Component({
  selector: 'app-labor-hours-report',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, InputDate, InputSelect,
    BtnsSection, LoadingOverlay, MatIcon,
  ],
  templateUrl: './labor-hours-report.html',
  styleUrl: './labor-hours-report.scss',
})
export class LaborHoursReport implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReportsApiService);
  private readonly employeesService = inject(EmployeesService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    employeeIds: this.fb.control<number[]>([], { nonNullable: true }),
  });

  employeesCatalog: Catalog[] = [];
  readonly loadingCatalog = signal(false);
  readonly loadingPreview = signal(false);
  readonly errorPreview = signal<string | null>(null);
  readonly pdfUrl = signal<SafeResourceUrl | null>(null);

  private lastObjectUrl: string | null = null;
  private lastGeneratedFilters: string | null = null;
  private request: Subscription | null = null;

  get hasActiveSearch(): boolean {
    return this.buildPayloadOrNull() !== null;
  }


  constructor() {
    this.loadEmployeesCatalog();

    this.formFilters.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.request?.unsubscribe();
        this.request = null;

        this.loadingPreview.set(false);
        this.errorPreview.set(null);

      });
  }

  private loadEmployeesCatalog(): void {
    this.loadingCatalog.set(true);
    this.employeesService.getCatalog()
      .pipe(finalize(() => this.loadingCatalog.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (employees) => { this.employeesCatalog = employees ?? []; },
        error: (err) => {
          console.error('[REPORTES] Catálogo trabajadores:', err);
          this.errorPreview.set('No se pudo cargar el catálogo de trabajadores.');
        },
      });
  }

  onBtnsSectionAction(action: string): void {
    if (action === 'search') this.preview();
    if (action === 'clean') {
      this.formFilters.reset({ dateRange: null, employeeIds: [] });
    }
  }

  private buildPayloadOrNull(): LaborHoursReportFilters | null {
    const range = this.formFilters.controls.dateRange.value;
    const startDate = toApiDate(range?.startDate);
    const endDate = toApiDate(range?.endDate);
    const ids = this.formFilters.controls.employeeIds.value ?? [];
    const employeeIds = ids.map(Number);
    if (!startDate || !endDate || startDate > endDate ||
      !employeeIds.length || employeeIds.some((id) => !Number.isInteger(id) || id < 1)) {
      return null;
    }
    return { startDate, endDate, employeeIds: Array.from(new Set(employeeIds)) };
  }

  private getFiltersKey(payload: LaborHoursReportFilters): string {
    return `${payload.startDate}|${payload.endDate}|${[...payload.employeeIds].sort((a, b) => a - b).join(',')}`;
  }

  private validatePdf(blob: Blob): boolean {
    if (blob.size <= 0 || !blob.type.toLowerCase().includes('pdf')) {
      this.errorPreview.set('El servidor no devolvió un PDF válido.');
      return false;
    }
    return true;
  }

  preview(): void {
    if (this.loadingPreview()) return;
    const payload = this.buildPayloadOrNull();
    if (!payload) {
      this.formFilters.markAllAsTouched();
      this.errorPreview.set('Selecciona un rango válido y al menos un trabajador.');
      return;
    }
    this.errorPreview.set(null);
    this.loadingPreview.set(true);
    this.request = this.api.previewLaborHoursReport(payload)
      .pipe(finalize(() => this.loadingPreview.set(false)))
      .subscribe({
        next: (blob) => {
          if (this.validatePdf(blob)) this.setPdfBlob(blob, this.getFiltersKey(payload));
        },
        error: (err) => {
          console.error('[REPORTES] Horas por trabajador:', err);
          this.errorPreview.set('No se pudo generar el reporte de horas por trabajador.');
        },
      });
  }

  downloadPdf(): void {
    if (this.loadingPreview()) return;
    const payload = this.buildPayloadOrNull();
    if (!payload) {
      this.errorPreview.set('Selecciona un rango válido y al menos un trabajador.');
      return;
    }
    const key = this.getFiltersKey(payload);
    if (this.lastObjectUrl && this.lastGeneratedFilters === key) {
      this.forceDownload(this.lastObjectUrl);
      return;
    }
    this.errorPreview.set(null);
    this.loadingPreview.set(true);
    this.request = this.api.previewLaborHoursReport(payload)
      .pipe(finalize(() => this.loadingPreview.set(false)))
      .subscribe({
        next: (blob) => {
          if (!this.validatePdf(blob)) return;
          this.setPdfBlob(blob, key);
          if (this.lastObjectUrl) this.forceDownload(this.lastObjectUrl);
        },
        error: (err) => {
          console.error('[REPORTES] Descarga horas por trabajador:', err);
          this.errorPreview.set('No se pudo descargar el reporte.');
        },
      });
  }

  private setPdfBlob(blob: Blob, key: string): void {
    this.clearPdf();
    this.lastObjectUrl = URL.createObjectURL(blob);
    this.lastGeneratedFilters = key;
    this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.lastObjectUrl));
  }

  private clearPdf(): void {
    this.pdfUrl.set(null);
    if (this.lastObjectUrl) URL.revokeObjectURL(this.lastObjectUrl);
    this.lastObjectUrl = null;
    this.lastGeneratedFilters = null;
  }

  private forceDownload(url: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'reporte-horas-por-trabajador-y-proyecto.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.clearPdf();
  }
}
