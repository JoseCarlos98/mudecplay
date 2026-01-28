// src/app/pages/reports/tabs/area-report/area-report.ts
import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';

import { DateRangeValue, InputDate } from '../../../../shared/ui/input-date/input-date';
import { SearchMultiSelect } from '../../../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
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
    SearchMultiSelect,
    BtnsSection,
    MatIcon,
    InputSelect
  ],
  templateUrl: './area-report.html',
  styleUrl: './area-report.scss',
})
export class AreaReport implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReportsApiService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly catalogsService = inject(CatalogsService);

  pdfUrl = signal<SafeResourceUrl | null>(null);
  private lastObjectUrl: string | null = null;

  formFilters = this.fb.group({
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
    this.loadCatalogs()
  }

   loadCatalogs() {
    this.catalogsService.areasSuppliersCatalog().subscribe({
      next: (response: Catalog[]) => {
        this.catalogArea = response;
      },
      error: (err) => console.error('Error al cargar estados de gasto:', err),
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
    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.api.saveByAreaHistory(payload).subscribe({
      next: (res) => console.log('[REPORTES][AREA] historial ok:', res),
      error: (err) => console.error('[REPORTES][AREA] historial error', err),
    });
  }

  private preview(): void {
    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.api.previewByArea(payload).subscribe({
      next: (blob) => {
        this.revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        this.lastObjectUrl = url;
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        console.log('[REPORTES][AREA] PDF preview OK');
      },
      error: (err) => console.error('[REPORTES][AREA] preview error', err),
    });
  }

  private buildPayloadOrNull(): ByAreaPreviewPayload | null {
    const v = this.formFilters.getRawValue();
    const startDate = v.dateRange?.startDate;
    const endDate = v.dateRange?.endDate;
    const areaIds = v?.areaIds || [];

    console.log(v);
    
    if (!startDate || !endDate) return null;

    return {
      startDate,
      endDate,
      areaIds
    };
  }

  private clear(): void {
    this.formFilters.reset({ dateRange: null, areaIds: [] }, { emitEvent: false });
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
