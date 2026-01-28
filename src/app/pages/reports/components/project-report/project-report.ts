// src/app/pages/reports/tabs/project-report/project-report.ts
import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';

import { DateRangeValue, InputDate } from '../../../../shared/ui/input-date/input-date';
import { SearchMultiSelect } from '../../../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';

import { ProjectDetailPreviewPayload, ReportsApiService } from '../../services/reports-api.service';

@Component({
  selector: 'app-project-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputDate,
    Autocomplete,
    SearchMultiSelect,
    BtnsSection,
    MatIcon,
  ],
  templateUrl: './project-report.html',
  styleUrl: './project-report.scss',
})
export class ProjectReport implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReportsApiService);
  private readonly sanitizer = inject(DomSanitizer);

  pdfUrl = signal<SafeResourceUrl | null>(null);
  private lastObjectUrl: string | null = null;

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null, {
      validators: Validators.required,
    }),
    suppliersIds: this.fb.control<Catalog[]>([]),
    projectId: this.fb.control<number | null>(null, {
      validators: Validators.required,
    }),
  });

  get hasActiveFilters(): boolean {
    const v = this.formFilters.getRawValue();
    const hasDates = !!v.dateRange?.startDate || !!v.dateRange?.endDate;
    const hasSuppliers = (v.suppliersIds?.length ?? 0) > 0;
    const hasProject = !!v.projectId;
    return hasDates || hasSuppliers || hasProject;
  }

  get hasActiveSearch(): boolean {
    const v = this.formFilters.getRawValue();
    return !!v.dateRange?.startDate && !!v.dateRange?.endDate && !!v.projectId;
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
    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.api.saveProjectDetailHistory(payload).subscribe({
      next: (res) => console.log('[REPORTES] historial ok:', res),
      error: (err) => console.error('[REPORTES] historial error', err),
    });
  }

  downloadPdf(): void {
    // descarga el PDF del preview ya generado (sin guardar historial)
    if (this.lastObjectUrl) {
      this.forceDownload(this.lastObjectUrl, 'reporte-detalle-proyecto.pdf');
      return;
    }

    // si aún no hay preview, lo genera y luego descarga
    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.api.previewProjectDetail(payload).subscribe({
      next: (blob) => {
        this.revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        this.lastObjectUrl = url;
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.forceDownload(url, 'reporte-detalle-proyecto.pdf');
      },
      error: (err) => console.error('[REPORTES] download preview error', err),
    });
  }

  private preview(): void {
    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.api.previewProjectDetail(payload).subscribe({
      next: (blob) => {
        this.revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        this.lastObjectUrl = url;
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        console.log('[REPORTES] PDF preview OK');
      },
      error: (err) => console.error('[REPORTES] preview error', err),
    });
  }

  private buildPayloadOrNull(): ProjectDetailPreviewPayload | null {
    const v = this.formFilters.getRawValue();

    const startDate = v.dateRange?.startDate;
    const endDate = v.dateRange?.endDate;
    const projectId = v.projectId;

    if (!startDate || !endDate || !projectId) return null;

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
    this.formFilters.reset({ dateRange: null, suppliersIds: [], projectId: null }, { emitEvent: false });
    this.revokeObjectUrl();
    this.pdfUrl.set(null);
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
