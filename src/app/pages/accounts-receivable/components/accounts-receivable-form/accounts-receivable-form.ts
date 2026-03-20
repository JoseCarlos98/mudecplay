import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../../shared/ui/input-date/input-date';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../shared/ui/btns-section/btns-section';

import { DialogService } from '../../../../shared/services/dialog.service';
import { AccountsReceivableService } from '../../services/accounts-receivable.service';
import * as entity from '../../interfaces/accounts-receivable-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

@Component({
  selector: 'app-accounts-receivable-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModuleHeader,
    InputField,
    InputDate,
    InputSelect,
    BtnsSection,
    MatIconModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './accounts-receivable-form.html',
  styleUrl: './accounts-receivable-form.scss',
})
export class AccountsReceivableForm implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly accountsReceivableService = inject(AccountsReceivableService);
  private readonly fb = inject(FormBuilder);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  readonly router = inject(Router);

  readonly headerConfig = HEADER_CONFIG;
  readonly statusOptions = entity.ACCOUNTS_RECEIVABLE_STATUS_OPTIONS;
  readonly companyOptions = entity.ACCOUNTS_RECEIVABLE_COMPANY_OPTIONS;

  isXmlImport = false;
  cfdiUuidFromXml: string | null = null;

  xmlQueueTotal = 0;
  xmlQueuePending = 0;

  accountReceivableId = 0;
  formData!: entity.AccountReceivableDetail;

  form: FormGroup = this.fb.group({
    company_code: this.fb.control<string | null>(null, { validators: Validators.required }),
    emitter_name: this.fb.control<string | null>(null, { validators: Validators.required }),
    emitter_rfc: this.fb.control<string | null>(null, { validators: Validators.required }),
    receiver_name: this.fb.control<string | null>(null, { validators: Validators.required }),
    receiver_rfc: this.fb.control<string | null>(null, { validators: Validators.required }),
    issue_date: this.fb.control<string | null>(null, { validators: Validators.required }),
    series: this.fb.control<string | null>(null),
    folio: this.fb.control<string | null>(null, { validators: Validators.required }),
    cfdi_uuid: this.fb.control<string | null>(null, { validators: Validators.required }),
    subtotal: this.fb.control<number | null>(null, { validators: Validators.required }),
    total: this.fb.control<number | null>(null, { validators: Validators.required }),
    currency: this.fb.control<string | null>('MXN', { validators: Validators.required }),
    source_file_name: this.fb.control<string | null>(null),

    status: this.fb.control<'pending' | 'collected' | null>('pending', {
      validators: Validators.required,
    }),
    collected_at: this.fb.control<string | null>(null),
  });

  get currentXmlIndex(): number {
    if (!this.xmlQueueTotal) return 1;
    return this.xmlQueueTotal - this.xmlQueuePending;
  }

  get invoiceDisplay(): string {
    const raw = this.form.getRawValue();
    return raw.series ? `${raw.series}-${raw.folio}` : `${raw.folio ?? ''}`;
  }

  ngOnInit(): void {
    const idParam = this.activatedRoute.snapshot.paramMap.get('id');

    if (idParam) {
      this.accountReceivableId = +idParam;
      this.loadAccountReceivable(this.accountReceivableId);
    } else {
      if (this.accountsReceivableService.hasMoreXmlDrafts()) {
        this.loadNextXmlFromQueueOrExit();
      } else {
        this.navigateToList();
      }
    }

    this.form
      .get('status')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value === 'pending') {
          this.form.get('collected_at')?.setValue(null, { emitEvent: false });
        } else if (value === 'collected' && !this.form.get('collected_at')?.value) {
          this.form.get('collected_at')?.setValue(this.getTodayIsoDate(), {
            emitEvent: false,
          });
        }
      });
  }

  private getTodayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private applyReadonlyLocking(): void {
    [
      'company_code',
      'emitter_name',
      'emitter_rfc',
      'receiver_name',
      'receiver_rfc',
      'issue_date',
      'series',
      'folio',
      'cfdi_uuid',
      'subtotal',
      'total',
      'currency',
      'source_file_name',
    ].forEach((field) => {
      this.form.get(field)?.disable();
    });
  }

  loadAccountReceivable(id: number): void {
    this.accountsReceivableService.getById(id).subscribe({
      next: (response) => {
        this.formData = response;
        this.isXmlImport = !!response.cfdi_uuid;
        this.cfdiUuidFromXml = response.cfdi_uuid ?? null;

        this.form.patchValue({
          company_code: response.company_code,
          emitter_name: response.emitter_name,
          emitter_rfc: response.emitter_rfc,
          receiver_name: response.receiver_name,
          receiver_rfc: response.receiver_rfc,
          issue_date: response.issue_date,
          series: response.series,
          folio: response.folio,
          cfdi_uuid: response.cfdi_uuid,
          subtotal: response.subtotal,
          total: response.total,
          currency: response.currency,
          source_file_name: response.source_file_name,
          status: response.status,
          collected_at: response.collected_at,
        });

        this.applyReadonlyLocking();
      },
      error: (err) => console.error('Error al cargar cuenta por cobrar:', err),
    });
  }

  patchFormFromXmlDraft(draft: entity.XmlAccountReceivableDraftDto): void {
    this.isXmlImport = true;
    this.cfdiUuidFromXml = draft.uuid;

    this.form.patchValue({
      company_code: draft.companyCode,
      emitter_name: draft.emitterName,
      emitter_rfc: draft.emitterRfc,
      receiver_name: draft.receiverName,
      receiver_rfc: draft.receiverRfc,
      issue_date: draft.issueDate,
      series: draft.series,
      folio: draft.folio,
      cfdi_uuid: draft.uuid,
      subtotal: draft.subtotal,
      total: draft.total,
      currency: draft.currency,
      source_file_name: draft.sourceFileName,
      status: 'pending',
      collected_at: null,
    });

    this.applyReadonlyLocking();
  }

  saveData(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildCreatePayloadFromForm();

    this.accountsReceivableService.create(payload).subscribe({
      next: (response) => {
        if (!response.success) return;

        if (this.isXmlImport && this.accountsReceivableService.hasMoreXmlDrafts()) {
          this.loadNextXmlFromQueueOrExit();
          return;
        }

        this.accountsReceivableService.clearXmlQueue();
        this.navigateToList();
      },
      error: (err) => console.error('Error al crear cuenta por cobrar:', err),
    });
  }

  updateData(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildUpdatePayloadFromForm();

    this.accountsReceivableService.update(this.accountReceivableId, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigateByUrl('/cuentas-por-cobrar');
        }
      },
      error: (err) => console.error('Error al actualizar cuenta por cobrar:', err),
    });
  }

  buildCreatePayloadFromForm(): entity.CreateAccountReceivable {
    const raw = this.form.getRawValue();

    return {
      cfdi_uuid: raw.cfdi_uuid!,
      series: raw.series ?? null,
      folio: raw.folio!,
      company_code: raw.company_code!,
      emitter_rfc: raw.emitter_rfc!,
      emitter_name: raw.emitter_name!,
      receiver_rfc: raw.receiver_rfc!,
      receiver_name: raw.receiver_name!,
      issue_date: raw.issue_date!,
      subtotal: Number(raw.subtotal ?? 0),
      total: Number(raw.total ?? 0),
      currency: raw.currency ?? 'MXN',
      status: raw.status ?? 'pending',
      collected_at: raw.status === 'collected' ? raw.collected_at ?? this.getTodayIsoDate() : null,
      source_file_name: raw.source_file_name ?? null,
    };
  }

  buildUpdatePayloadFromForm(): entity.UpdateAccountReceivable {
    const raw = this.form.getRawValue();

    return {
      status: raw.status ?? 'pending',
      collected_at: raw.status === 'collected' ? raw.collected_at ?? this.getTodayIsoDate() : null,
    };
  }

  loadNextXmlFromQueueOrExit(): void {
    const nextDraft = this.accountsReceivableService.consumeNextXmlDraft();

    if (!nextDraft) {
      this.accountsReceivableService.clearXmlQueue();
      this.isXmlImport = false;
      this.cfdiUuidFromXml = null;
      this.navigateToList();
      return;
    }

    this.form.reset({
      company_code: null,
      emitter_name: null,
      emitter_rfc: null,
      receiver_name: null,
      receiver_rfc: null,
      issue_date: null,
      series: null,
      folio: null,
      cfdi_uuid: null,
      subtotal: null,
      total: null,
      currency: 'MXN',
      source_file_name: null,
      status: 'pending',
      collected_at: null,
    });

    Object.keys(this.form.controls).forEach((key) => {
      this.form.get(key)?.enable({ emitEvent: false });
    });

    this.patchFormFromXmlDraft(nextDraft);

    const status = this.accountsReceivableService.getXmlQueueStatus();
    this.xmlQueueTotal = status.total;
    this.xmlQueuePending = status.pending;
  }

  confirmExitFromXmlFlow(): void {
    const pendingText =
      this.xmlQueuePending > 0
        ? `Tienes ${this.xmlQueuePending} factura(s) pendiente(s) por registrar.\n\n`
        : '';

    this.dialogService
      .confirm({
        size: 'small',
        title: 'Salir del registro desde XML',
        message:
          `${pendingText}` +
          'Si sales ahora, esta factura y las pendientes no se registrarán en cuentas por cobrar. ' +
          'Podrás volver a subir los XML cuando quieras.\n\n' +
          '¿Quieres salir de todos modos?',
        confirmText: 'Salir sin guardar',
        cancelText: 'Seguir capturando',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.accountsReceivableService.clearXmlQueue();
        this.navigateToList();
      });
  }

  onHeaderAction(action: ModuleHeaderAction | string): void {
    switch (action) {
      case 'back':
        if (this.cfdiUuidFromXml && this.router.url.includes('nuevo')) {
          this.confirmExitFromXmlFlow();
        } else {
          this.navigateToList();
        }
        break;
    }
  }

  onFooterAction(action: ModuleFooterAction | string): void {
    switch (action) {
      case 'cancel':
        if (this.cfdiUuidFromXml && this.router.url.includes('nuevo')) {
          this.confirmExitFromXmlFlow();
        } else {
          this.navigateToList();
        }
        break;
    }
  }

  navigateToList(): void {
    this.router.navigateByUrl('/cuentas-por-cobrar');
  }
}