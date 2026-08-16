import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { MatIcon } from '@angular/material/icon';

import { DateRangeValue, InputDate } from '../../../../shared/ui/input-date/input-date';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { LoadingOverlay } from '../../../../shared/ui/loading-overlay/loading-overlay';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import {
  AccountsReceivablePreviewPayload,
} from '../../interfaces/reports-interfaces';
import { ReportsApiService } from '../../services/reports-api.service';

const COMPANY_OPTIONS: Catalog[] = [
  { id: 'MUDECPLAY', name: 'MUDECPLAY' },
  { id: 'CONSTRUCTORA_PELEN', name: 'CONSTRUCTORA PELEN' },
];

const STATUS_OPTIONS: Catalog[] = [
  { id: 'pending', name: 'Pendiente' },
  { id: 'collected', name: 'Cobrada' },
];

@Component({
  selector: 'app-accounts-receivable-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputDate,
    InputField,
    InputSelect,
    BtnsSection,
    MatIcon,
    LoadingOverlay,
  ],
  templateUrl: './accounts-receivable-report.html',
  styleUrl: './accounts-receivable-report.scss',
})
export class AccountsReceivableReport implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ReportsApiService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly companyOptions = COMPANY_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;

  readonly loadingPreview = signal(false);
  readonly loadingHistory = signal(false);
  readonly errorPreview = signal<string | null>(null);

  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  private lastObjectUrl: string | null = null;

  readonly formFilters = this.fb.group({
    dateRange: this.fb.control<DateRangeValue | null>(null),
    companyCodes: this.fb.control<string[]>([]),
    status: this.fb.control<'pending' | 'collected' | null>(null),
    receiverRfc: this.fb.control<string>(''),
  });

  get hasActiveFilters(): boolean {
    const v = this.formFilters.getRawValue();
    const hasDates = !!(v.dateRange?.startDate || v.dateRange?.endDate);
    const hasCompanies = (v.companyCodes?.length ?? 0) > 0;
    const hasStatus = !!v.status;
    const hasReceiverRfc = !!v.receiverRfc?.trim();

    return hasDates || hasCompanies || hasStatus || hasReceiverRfc;
  }

  get hasActiveSearch(): boolean {
    return true;
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

    const payload = this.buildPayload();

    this.loadingHistory.set(true);

    this.api.saveAccountsReceivableHistory(payload)
      .pipe(finalize(() => this.loadingHistory.set(false)))
      .subscribe({
        next: (res) => {
          console.log('[REPORTES] historial (cuentas por cobrar) ok:', res);
        },
        error: (err) => {
          console.error('[REPORTES] historial (cuentas por cobrar) error', err);
        },
      });
  }

  downloadPdf(): void {
    if (this.loadingPreview() || this.loadingHistory()) return;

    if (this.lastObjectUrl) {
      this.forceDownload(this.lastObjectUrl, 'reporte-cuentas-por-cobrar.pdf');
      return;
    }

    const payload = this.buildPayload();

    this.loadingPreview.set(true);
    this.errorPreview.set(null);

    this.api.previewAccountsReceivable(payload)
      .pipe(finalize(() => this.loadingPreview.set(false)))
      .subscribe({
        next: (blob) => {
          this.revokeObjectUrl();
          const url = URL.createObjectURL(blob);
          this.lastObjectUrl = url;
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
          this.forceDownload(url, 'reporte-cuentas-por-cobrar.pdf');
        },
        error: (err) => {
          console.error('[REPORTES] download preview (cuentas por cobrar) error', err);
          this.errorPreview.set('No se pudo generar el PDF del reporte.');
        },
      });
  }

  private preview(): void {
    if (this.loadingPreview() || this.loadingHistory()) return;

    const payload = this.buildPayload();

    this.loadingPreview.set(true);
    this.errorPreview.set(null);

    this.api.previewAccountsReceivable(payload)
      .pipe(finalize(() => this.loadingPreview.set(false)))
      .subscribe({
        next: (blob) => {
          this.revokeObjectUrl();
          const url = URL.createObjectURL(blob);
          this.lastObjectUrl = url;
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
          console.log('[REPORTES] PDF preview (cuentas por cobrar) OK');
        },
        error: (err) => {
          console.error('[REPORTES] preview (cuentas por cobrar) error', err);
          this.errorPreview.set('No se pudo generar el preview del reporte.');
        },
      });
  }

  private buildPayload(): AccountsReceivablePreviewPayload {
    const v = this.formFilters.getRawValue();

    const startDate = v.dateRange?.startDate ?? null;
    const endDate = v.dateRange?.endDate ?? null;
    const receiverRfc = v.receiverRfc?.trim() || null;

    return {
      startDate,
      endDate,
      companyCodes: (v.companyCodes ?? []).length ? v.companyCodes : undefined,
      status: v.status ?? null,
      receiverRfc,
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
        companyCodes: [],
        status: null,
        receiverRfc: '',
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