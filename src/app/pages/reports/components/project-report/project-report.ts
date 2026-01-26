import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DateRangeValue, InputDate } from '../../../../shared/ui/input-date/input-date';
import { SearchMultiSelect } from '../../../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { ReportsService } from '../../services/reports.service';
import { ProjectDetailReportFilters } from '../../interfaces/reports-interfaces';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';


@Component({
  selector: 'app-project-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputDate,
    SearchMultiSelect,
    Autocomplete,
    BtnsSection,
  ],
  templateUrl: './project-report.html',
  styleUrl: './project-report.scss',
})
export class ProjectReport {
  private readonly fb = inject(FormBuilder);
  private readonly reportsService = inject(ReportsService);

  formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    suppliersIds: this.fb.control<Catalog[]>([]),
    projectIds: this.fb.control<Catalog[]>([]),
  });

  get hasActiveFilters(): boolean {
    const v = this.formFilters.getRawValue();

    const hasDates = !!v.dateRange?.startDate || !!v.dateRange?.endDate;
    const hasSuppliers = (v.suppliersIds?.length ?? 0) > 0;
    const hasProjects = (v.projectIds?.length ?? 0) > 0;

    return hasDates || hasSuppliers || hasProjects;
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

  private preview(): void {
    const v = this.formFilters.getRawValue();

    // Validación mínima (para que no mande null)
    if (!v.dateRange?.startDate || !v.dateRange?.endDate) {
      console.warn('[REPORTES] Selecciona un rango de fechas.');
      return;
    }

    const payload: ProjectDetailReportFilters = {
      startDate: v.dateRange.startDate,
      endDate: v.dateRange.endDate,
      // suppliersIds: v.suppliersIds ?? [],
      suppliersIds: (v.suppliersIds ?? []).map((s: any) => s.id),
      projectIds: v.projectIds ?? [],
    };

    console.log('[REPORTES] payload preview:', payload);

    this.reportsService.previewProjectDetail(payload).subscribe({
      next: (res) => console.log('[REPORTES] preview ok:', res),
      error: (err) => console.error('[REPORTES] preview error:', err),
    });
  }

  private clear(): void {
    this.formFilters.reset(
      {
        dateRange: null,
        suppliersIds: [],
        projectIds: [],
      },
      { emitEvent: false },
    );

    console.log('[REPORTES] filtros limpiados');
  }
}
