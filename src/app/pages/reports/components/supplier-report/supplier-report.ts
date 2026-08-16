import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { DateRangeValue, InputDate } from '../../../../shared/ui/input-date/input-date';
import { SearchMultiSelect } from '../../../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { ProjectBySupplierPreviewPayload, ReportsApiService } from '../../services/reports-api.service';

@Component({
  selector: 'app-supplier-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputDate,
    Autocomplete,
    SearchMultiSelect,
    BtnsSection,
    MatIcon,
    LoadingOverlay,
  ],
  templateUrl: './supplier-report.html',
  styleUrl: './supplier-report.scss',
})
export class SupplierReport implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReportsApiService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loadingPreview = signal(false);
  readonly loadingHistory = signal(false);
  readonly errorPreview = signal<string | null>(null);

  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  private lastObjectUrl: string | null = null;

  readonly formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    suppliersIds: this.fb.control<Catalog[]>([]),
    projectId: this.fb.control<number | null>(null, {
      validators: Validators.required,
    }),
  });

  get hasActiveFilters(): boolean {
    const v = this.formFilters.getRawValue();
    return !!v.projectId;
  }

  get hasActiveSearch(): boolean {
    const v = this.formFilters.getRawValue();
    return !!v.projectId;
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'search':
        this.preview();
        break;
      case 'clean':
        this.clear();
        break;
    }
  }

  onSaveHistory(): void {
    if (this.loadingPreview() || this.loadingHistory()) return;

    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.loadingHistory.set(true);

    this.api.saveProjectBySupplierHistory(payload)
      .pipe(finalize(() => this.loadingHistory.set(false)))
      .subscribe({
        next: (res) => {
          console.log('[REPORTES] historial (por proveedor) ok:', res);
        },
        error: (err) => {
          console.error('[REPORTES] historial (por proveedor) error', err);
        },
      });
  }

  downloadPdf(): void {
    if (this.loadingPreview() || this.loadingHistory()) return;

    if (this.lastObjectUrl) {
      this.forceDownload(this.lastObjectUrl, 'reporte-gasto-por-proveedor.pdf');
      return;
    }

    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.loadingPreview.set(true);
    this.errorPreview.set(null);

    this.api.previewProjectBySupplier(payload)
      .pipe(finalize(() => this.loadingPreview.set(false)))
      .subscribe({
        next: (blob) => {
          this.revokeObjectUrl();
          const url = URL.createObjectURL(blob);
          this.lastObjectUrl = url;
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
          this.forceDownload(url, 'reporte-gasto-por-proveedor.pdf');
        },
        error: (err) => {
          console.error('[REPORTES] download preview (por proveedor) error', err);
          this.errorPreview.set('No se pudo generar el PDF del reporte.');
        },
      });
  }

  private preview(): void {
    if (this.loadingPreview() || this.loadingHistory()) return;

    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.loadingPreview.set(true);
    this.errorPreview.set(null);

    this.api.previewProjectBySupplier(payload)
      .pipe(finalize(() => this.loadingPreview.set(false)))
      .subscribe({
        next: (blob) => {
          this.revokeObjectUrl();
          const url = URL.createObjectURL(blob);
          this.lastObjectUrl = url;
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
          console.log('[REPORTES] PDF preview (por proveedor) OK');
        },
        error: (err) => {
          console.error('[REPORTES] preview (por proveedor) error', err);
          this.errorPreview.set('No se pudo generar el preview del reporte.');
        },
      });
  }

  private buildPayloadOrNull(): ProjectBySupplierPreviewPayload | null {
    const v = this.formFilters.getRawValue();
    const startDate = v.dateRange?.startDate ?? null;
    const endDate = v.dateRange?.endDate ?? null;
    const projectId = v.projectId;

    if (!projectId) return null;

    return {
      startDate,
      endDate,
      suppliersIds: (v.suppliersIds ?? []).map((x) => Number(x.id)),
      projectId,
    };
  }

  private forceDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  private clear(): void {
    this.formFilters.reset(
      {
        dateRange: null,
        suppliersIds: [],
        projectId: null,
      },
      { emitEvent: false },
    );

    this.revokeObjectUrl();
    this.pdfUrl.set(null);
    this.errorPreview.set(null);
  }

  private revokeObjectUrl(): void {
    if (this.lastObjectUrl) {
      URL.revokeObjectURL(this.lastObjectUrl);
      this.lastObjectUrl = null;
    }
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }
}