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
import { finalize } from 'rxjs';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';


const PAYMENT_STATUS_OPTIONS: Catalog[] = [
  { id: 'open', name: 'Abierto' },
  { id: 'close', name: 'Cerrado' },
];


@Component({
  selector: 'app-project-status',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputDate,
    Autocomplete,
    SearchMultiSelect,
    BtnsSection,
    MatIcon,
    InputSelect
  ],
  templateUrl: './project-status.html',
  styleUrl: './project-status.scss',
})
export class ProjectStatus implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReportsApiService);
  private readonly sanitizer = inject(DomSanitizer);

   readonly statusProjectOptions = PAYMENT_STATUS_OPTIONS;

  loadingPreview = signal(false);
  errorPreview = signal<string | null>(null);

  pdfUrl = signal<SafeResourceUrl | null>(null);
  private lastObjectUrl: string | null = null;

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    suppliersIds: this.fb.control<Catalog[]>([]),
    projectId: this.fb.control<number | null>(null, {
      validators: Validators.required,
    }),
  });

  get hasActiveFilters(): boolean {
    const v = this.formFilters.getRawValue();
    const hasProject = !!v.projectId;
    return hasProject;
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

    this.loadingPreview.set(true);
    this.errorPreview.set(null);

    this.api.previewProjectDetail(payload).pipe(
      finalize(() => this.loadingPreview.set(false)),
    ).subscribe({
      next: (blob) => {
        this.revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        this.lastObjectUrl = url;
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      },
      error: (err) => {
        console.error('[REPORTES] preview error', err);
        this.errorPreview.set('No se pudo generar el preview. Intenta de nuevo.');
      },
    });
  }

  private buildPayloadOrNull(): ProjectDetailPreviewPayload | null {
    const v = this.formFilters.getRawValue();

    const startDate = v.dateRange?.startDate;
    const endDate = v.dateRange?.endDate;
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