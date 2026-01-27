import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DateRangeValue, InputDate } from '../../../../shared/ui/input-date/input-date';
import { SearchMultiSelect } from '../../../../shared/ui/autocomplete-multiple/autocomplete-multiple';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { ProjectDetailPreviewPayload, ReportsApiService } from '../../services/reports-api.service';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';


@Component({
  selector: 'app-project-report',
  standalone: true,
  imports: [CommonModule, Autocomplete, ReactiveFormsModule, InputDate, SearchMultiSelect, BtnsSection],
  templateUrl: './project-report.html',
  styleUrl: './project-report.scss',
})
export class ProjectReport {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReportsApiService);
  private readonly sanitizer = inject(DomSanitizer);

  pdfUrl = signal<SafeResourceUrl | null>(null);

  formFilters = this.fb.group({
    
    // dateRange: this.fb.control<DateRangeValue | null>(null),
    dateRange: this.fb.control<DateRangeValue | null>(null, {
      validators: Validators.required,
    }),
    suppliersIds: this.fb.control<Catalog[]>([]),
    projectId: this.fb.control<Catalog[]>([]), // en UI es multiple, pero aquí tomaremos 1
  });

  get hasActiveFilters(): boolean {
    const v = this.formFilters.getRawValue();
    const hasDates = !!v.dateRange?.startDate || !!v.dateRange?.endDate;
    const hasSuppliers = (v.suppliersIds?.length ?? 0) > 0;
    const hasProjects = (v.projectId?.length ?? 0) > 0;
    return hasDates || hasSuppliers || hasProjects;
  }
  
  get hasActiveSearch(): boolean {
    const v = this.formFilters.getRawValue();
    const hasDates = !!v.dateRange?.startDate || !!v.dateRange?.endDate;
    return hasDates
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
    console.log(v);
    

    const startDate = v.dateRange?.startDate;
    const endDate = v.dateRange?.endDate;
    const projectId = v.projectId;

    console.log(startDate);
    console.log(endDate);
    console.log(projectId);
    

    if (!startDate || !endDate || !projectId) {
      console.log('[REPORTES] faltan filtros obligatorios (startDate/endDate/projectId)');
      return;
    }

    const payload:ProjectDetailPreviewPayload | any = {
      startDate,
      endDate,
      suppliersIds: (v.suppliersIds ?? []).map(x => x.id),
      projectId,
    };

    console.log(payload);
    

    this.api.previewProjectDetail(payload).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        console.log('[REPORTES] PDF preview OK');
      },
      error: (err) => console.error('[REPORTES] preview error', err),
    });
  }

  private clear(): void {
    this.formFilters.reset({ dateRange: null, suppliersIds: [], projectId: [] }, { emitEvent: false });
    this.pdfUrl.set(null);
  }
}
