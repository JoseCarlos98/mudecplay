import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { DateRangeValue, InputDate } from '../../../../shared/ui/input-date/input-date';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { ByAreaPreviewPayload, ReportsApiService } from '../../services/reports-api.service';
import { CatalogsService } from '../../../../shared/services/catalogs.service';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';

@Component({
  selector: 'app-area-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputDate,
    BtnsSection,
    MatIcon,
    InputSelect,
    LoadingOverlay,
  ],
  templateUrl: './area-report.html',
  styleUrl: './area-report.scss',
})
export class AreaReport implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReportsApiService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly catalogsService = inject(CatalogsService);

  readonly loadingPreview = signal(false);
  readonly loadingHistory = signal(false);
  readonly errorPreview = signal<string | null>(null);

  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  private lastObjectUrl: string | null = null;

  readonly formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null, {
      validators: Validators.required,
    }),
    areaIds: this.fb.control<number[]>([]),
  });

  catalogArea: Catalog[] = [];

  get hasActiveFilters(): boolean {
    const v = this.formFilters.getRawValue();
    const hasDates = !!v.dateRange?.startDate || !!v.dateRange?.endDate;
    const hasAreas = (v.areaIds?.length ?? 0) > 0;
    return hasDates || hasAreas;
  }

  get hasActiveSearch(): boolean {
    const v = this.formFilters.getRawValue();
    return !!v.dateRange?.startDate && !!v.dateRange?.endDate;
  }

  ngOnInit(): void {
    this.loadCatalogs();
  }

  loadCatalogs(): void {
    this.catalogsService.areasSuppliersCatalog().subscribe({
      next: (response: Catalog[]) => {
        this.catalogArea = response;
      },
      error: (err) => {
        console.error('Error al cargar áreas:', err);
      },
    });
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

    this.api.saveByAreaHistory(payload)
      .pipe(finalize(() => this.loadingHistory.set(false)))
      .subscribe({
        next: (res) => {
          console.log('[REPORTES][AREA] historial ok:', res);
        },
        error: (err) => {
          console.error('[REPORTES][AREA] historial error', err);
        },
      });
  }

  private preview(): void {
    if (this.loadingPreview() || this.loadingHistory()) return;

    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.loadingPreview.set(true);
    this.errorPreview.set(null);

    this.api.previewByArea(payload)
      .pipe(finalize(() => this.loadingPreview.set(false)))
      .subscribe({
        next: (blob) => {
          this.revokeObjectUrl();
          const url = URL.createObjectURL(blob);
          this.lastObjectUrl = url;
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
          console.log('[REPORTES][AREA] PDF preview OK');
        },
        error: (err) => {
          console.error('[REPORTES][AREA] preview error', err);
          this.errorPreview.set('No se pudo generar el preview. Intenta de nuevo.');
        },
      });
  }

  private buildPayloadOrNull(): ByAreaPreviewPayload | null {
    const v = this.formFilters.getRawValue();
    const startDate = v.dateRange?.startDate ?? null;
    const endDate = v.dateRange?.endDate ?? null;
    const areaIds = v.areaIds ?? [];

    if (!startDate || !endDate) return null;

    return {
      startDate,
      endDate,
      areaIds,
    };
  }

  private clear(): void {
    this.formFilters.reset(
      {
        dateRange: null,
        areaIds: [],
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