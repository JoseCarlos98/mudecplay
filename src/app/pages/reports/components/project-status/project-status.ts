import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIcon } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { DateRangeValue, InputDate } from '../../../../shared/ui/input-date/input-date';
import { SearchMultiSelect } from '../../../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { ReportsApiService } from '../../services/reports-api.service';
import { ProjectsByStatusPreviewPayload } from '../../interfaces/reports-interfaces';

const STATUS_PROJECT_OPTIONS: Catalog[] = [
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
    SearchMultiSelect,
    BtnsSection,
    MatIcon,
    InputSelect,
    LoadingOverlay,
  ],
  templateUrl: './project-status.html',
  styleUrl: './project-status.scss',
})
export class ProjectStatus implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReportsApiService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly statusProjectOptions = STATUS_PROJECT_OPTIONS;

  readonly loadingPreview = signal(false);
  readonly loadingHistory = signal(false);
  readonly errorPreview = signal<string | null>(null);

  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  private lastObjectUrl: string | null = null;

  readonly formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    projectIds: this.fb.control<Catalog[]>([], {
      validators: Validators.required,
    }),
    statusProject: this.fb.control<'open' | 'close' | null>('open', {
      validators: Validators.required,
    }),
  });

  get hasActiveFilters(): boolean {
    const v = this.formFilters.getRawValue();
    const hasStatus = !!v.statusProject;
    const hasProjects = (v.projectIds?.length ?? 0) > 0;
    return hasStatus && hasProjects;
  }

  get hasActiveSearch(): boolean {
    return this.hasActiveFilters;
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

    this.api.saveProjectsByStatusHistory(payload)
      .pipe(finalize(() => this.loadingHistory.set(false)))
      .subscribe({
        next: (res) => {
          console.log('[REPORTES] historial (estado financiero) ok:', res);
        },
        error: (err) => {
          console.error('[REPORTES] historial (estado financiero) error', err);
        },
      });
  }

  private preview(): void {
    if (this.loadingPreview() || this.loadingHistory()) return;

    const payload = this.buildPayloadOrNull();
    if (!payload) return;

    this.loadingPreview.set(true);
    this.errorPreview.set(null);

    this.api
      .previewProjectsByStatus(payload)
      .pipe(finalize(() => this.loadingPreview.set(false)))
      .subscribe({
        next: (blob) => {
          this.revokeObjectUrl();
          const url = URL.createObjectURL(blob);
          this.lastObjectUrl = url;
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        },
        error: (err) => {
          console.error('[REPORTES] preview (estado financiero) error', err);
          this.errorPreview.set('No se pudo generar el preview. Intenta de nuevo.');
        },
      });
  }

  private buildPayloadOrNull(): ProjectsByStatusPreviewPayload | null {
    const v = this.formFilters.getRawValue();

    const startDate = v.dateRange?.startDate ?? null;
    const endDate = v.dateRange?.endDate ?? null;
    const statusProject = v.statusProject;
    const projectIds = v.projectIds ?? [];

    if (!statusProject) return null;
    if (!projectIds.length) return null;

    return {
      startDate,
      endDate,
      statusProject,
      projectIds: projectIds.map((x) => Number(x.id)),
    };
  }

  private clear(): void {
    this.formFilters.reset(
      {
        dateRange: null,
        projectIds: [],
        statusProject: null,
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