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

import { ProjectPayablesPreviewPayload, ReportsApiService } from '../../services/reports-api.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-project-payables',
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
  templateUrl: './project-payables.html',
  styleUrl: './project-payables.scss',
})
export class ProjectPayables implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReportsApiService);
  private readonly sanitizer = inject(DomSanitizer);

  loadingPreview = signal(false);
  errorPreview = signal<string | null>(null);

  pdfUrl = signal<SafeResourceUrl | null>(null);
  private lastObjectUrl: string | null = null;

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    suppliersIds: this.fb.control<Catalog[]>([]), // opcional
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

    this.api.saveProjectPayablesHistory(payload).subscribe({
      next: (res) => console.log('[REPORTES] payables historial ok:', res),
      error: (err) => console.error('[REPORTES] payables historial error', err),
    });
  }

  private preview(): void {
    console.log('llamar preview');
    
    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.loadingPreview.set(true);
    this.errorPreview.set(null);

    this.api.previewProjectPayables(payload).pipe(
      finalize(() => this.loadingPreview.set(false)),
    ).subscribe({
      next: (blob) => {
        this.revokeObjectUrl();
        const url = URL.createObjectURL(blob);
        this.lastObjectUrl = url;
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        console.log('[REPORTES] Payables PDF preview OK');
      },
      error: (err) => console.error('[REPORTES] payables preview error', err),
    });
  }

  private buildPayloadOrNull(): ProjectPayablesPreviewPayload | null {
    const v = this.formFilters.getRawValue();

    const startDate = v.dateRange?.startDate;
    const endDate = v.dateRange?.endDate;
    const projectId = v.projectId;

    if (!projectId) return null;

    return {
      startDate,
      endDate,
      projectId,
      suppliersIds: (v.suppliersIds ?? []).map((x) => Number(x.id)),
    };
  }

  private clear(): void {
    this.formFilters.reset(
      { dateRange: null, suppliersIds: [], projectId: null },
      { emitEvent: false },
    );
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
