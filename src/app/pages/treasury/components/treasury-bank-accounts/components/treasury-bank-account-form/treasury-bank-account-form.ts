import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize, forkJoin } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';


import * as entity from '../../../../interfaces/treasury.interfaces';
import { ModuleHeaderConfig } from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { Catalog } from '../../../../../../shared/interfaces/general-interfaces';
import { ModuleHeader } from '../../../../../../shared/ui/module-header/module-header';
import { BtnsSection } from '../../../../../../shared/ui/btns-section/btns-section';
import { InputField } from '../../../../../../shared/ui/input-field/input-field';
import { InputSelect } from '../../../../../../shared/ui/input-select/input-select';
import { TreasuryService } from '../../../../services/treasury.service';
import { CatalogsService } from '../../../../../../shared/services/catalogs.service';
import { DialogService } from '../../../../../../shared/services/dialog.service';

// =========================================================
// TESORERÍA: FORMULARIO DE CUENTA BANCARIA
// =========================================================

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

const CURRENCY_OPTIONS: Catalog[] = [
  { id: 'MXN', name: 'MXN' },
  { id: 'USD', name: 'USD' },
];

const ACTIVE_STATUS_OPTIONS: Catalog[] = [
  { id: 'true', name: 'Activa' },
  { id: 'false', name: 'Inactiva' },
];

@Component({
  selector: 'app-treasury-bank-account-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // UI
    ModuleHeader,
    BtnsSection,
    InputField,
    InputSelect,

    // Material
    MatIconModule,
  ],
  templateUrl: './treasury-bank-account-form.html',
  styleUrl: './treasury-bank-account-form.scss',
})
export class TreasuryBankAccountForm implements OnInit {
  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data = inject<entity.TreasuryBankAccountFormData>(MAT_DIALOG_DATA);

  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TreasuryBankAccountForm>);
  private readonly treasuryService = inject(TreasuryService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly dialogService = inject(DialogService);

  // =========================================================
  // CONFIG UI
  // =========================================================

  readonly headerConfig = HEADER_CONFIG;
  readonly currencyOptions = CURRENCY_OPTIONS;
  readonly activeStatusOptions = ACTIVE_STATUS_OPTIONS;

  companyOptions: Catalog[] = [];
  bankOptions: Catalog[] = [];

  isSaving = false;
  isLoading = false;

  // =========================================================
  // FORM
  // =========================================================

  form = this.fb.group({
    company_id: this.fb.control<Catalog | number | string | null>(null, {
      validators: [Validators.required],
    }),
    bank_id: this.fb.control<Catalog | number | string | null>(null, {
      validators: [Validators.required],
    }),
    account_identifier: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    alias: this.fb.control<string | null>(null, {
      validators: [Validators.maxLength(120)],
    }),
    currency: this.fb.control<string>('MXN', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(10)],
    }),
    is_active: this.fb.control<'true' | 'false'>('true', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.loadInitialData();
  }

  // =========================================================
  // GETTERS UI
  // =========================================================

  get isEditMode(): boolean {
    return this.data?.mode === 'edit';
  }

  get bankAccountId(): number | null {
    return this.data?.bankAccount?.id ?? null;
  }

  get title(): string {
    return this.isEditMode
      ? 'Editar cuenta bancaria'
      : 'Nueva cuenta bancaria';
  }

  get introText(): string {
    return this.isEditMode
      ? 'Actualiza los datos de la cuenta bancaria usada para importar movimientos.'
      : 'Registra una cuenta bancaria para importar movimientos y conciliarlos en Tesorería.';
  }

  get saveDisabled(): boolean {
    return this.form.invalid || this.isSaving || this.isLoading;
  }

  // =========================================================
  // CARGA INICIAL
  // =========================================================

  private loadInitialData(): void {
    this.isLoading = true;

    forkJoin({
      companies: this.catalogsService.treasuryCompaniesCatalog(),
      banks: this.catalogsService.treasuryBanksCatalog(),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: ({ companies, banks }) => {
          this.companyOptions = companies ?? [];
          this.bankOptions = banks ?? [];
          console.log(this.bankOptions);
          this.bankOptions = this.bankOptions.filter(
            (bank) => bank.name !== 'ALBO'
          );
          

          if (this.isEditMode && this.data?.bankAccount) {
            this.patchBankAccount(this.data.bankAccount);
          }
        },
        error: (err) => {
          console.error('Error cargando catálogos de cuenta bancaria:', err);

          this.dialogService
            .confirm({
              title: 'Error',
              message: 'No se pudieron cargar los catálogos de Tesorería.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
      });
  }

 private patchBankAccount(
  bankAccount: entity.TreasuryBankAccountTableRow,
): void {
  this.ensureCompanyOption(bankAccount);
  this.ensureBankOption(bankAccount);

  this.form.patchValue(
    {
      company_id: bankAccount.company?.id ?? null,
      bank_id: bankAccount.bank?.id ?? null,
      account_identifier: bankAccount.account_identifier ?? '',
      alias: bankAccount.alias ?? null,
      currency: bankAccount.currency || 'MXN',
      is_active: bankAccount.is_active ? 'true' : 'false',
    },
    { emitEvent: false },
  );

  if (this.identityLocked) {
    this.lockIdentityControls();
  }
}

private lockIdentityControls(): void {
  this.form.get('company_id')?.disable({ emitEvent: false });
  this.form.get('bank_id')?.disable({ emitEvent: false });
  this.form.get('account_identifier')?.disable({ emitEvent: false });
}

  // =========================================================
  // GUARDADO
  // =========================================================

  saveData(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();

    if (!payload) return;

    this.isSaving = true;

    const request$ =
      this.isEditMode && this.bankAccountId
        ? this.treasuryService.updateBankAccount(
            this.bankAccountId,
            payload as entity.UpdateTreasuryBankAccountPayload,
          )
        : this.treasuryService.createBankAccount(
            payload as entity.CreateTreasuryBankAccountPayload,
          );

    request$
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.success !== false) {
            this.closeModal(true);
          }
        },
        error: (err) => {
          console.error('Error guardando cuenta bancaria:', err);

          this.dialogService
            .confirm({
              title: 'Error',
              message: 'No se pudo guardar la cuenta bancaria.',
              confirmText: 'OK',
              cancelText: '',
            })
            .subscribe();
        },
      });
  }

private buildPayload():
  | entity.CreateTreasuryBankAccountPayload
  | entity.UpdateTreasuryBankAccountPayload
  | null {
  const raw = this.form.getRawValue();

  const companyId = this.getNumberId(raw.company_id);
  const bankId = this.getNumberId(raw.bank_id);
  const accountIdentifier = String(raw.account_identifier ?? '').trim();
  const alias = String(raw.alias ?? '').trim() || null;
  const currency = String(raw.currency ?? 'MXN').trim() || 'MXN';
  const isActive = String(raw.is_active) === 'true';

  if (this.isEditMode && this.identityLocked) {
    return {
      alias,
      currency,
      is_active: isActive,
    };
  }

  if (!companyId) {
    this.form.get('company_id')?.setErrors({ required: true });
    this.form.get('company_id')?.markAsTouched();
    return null;
  }

  if (!bankId) {
    this.form.get('bank_id')?.setErrors({ required: true });
    this.form.get('bank_id')?.markAsTouched();
    return null;
  }

  if (!accountIdentifier) {
    this.form.get('account_identifier')?.setErrors({ required: true });
    this.form.get('account_identifier')?.markAsTouched();
    return null;
  }

  const basePayload = {
    company_id: companyId,
    bank_id: bankId,
    account_identifier: accountIdentifier,
    alias,
    currency,
  };

  if (this.isEditMode) {
    return {
      ...basePayload,
      is_active: isActive,
    };
  }

  return basePayload;
}

  // =========================================================
  // ACCIONES FOOTER
  // =========================================================

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        this.saveData();
        break;

      case 'cancel':
        this.closeModal();
        break;

      default:
        break;
    }
  }

  // =========================================================
  // HELPERS CATÁLOGOS
  // =========================================================

  private ensureCompanyOption(
    bankAccount: entity.TreasuryBankAccountTableRow,
  ): void {
    const company = bankAccount.company;

    if (!company?.id) return;

    const exists = this.companyOptions.some(
      (option) => Number(option.id) === Number(company.id),
    );

    if (exists) return;

    this.companyOptions = [
      ...this.companyOptions,
      {
        id: company.id,
        name: company.name,
      },
    ];
  }

  private ensureBankOption(
    bankAccount: entity.TreasuryBankAccountTableRow,
  ): void {
    const bank = bankAccount.bank;

    if (!bank?.id) return;

    const exists = this.bankOptions.some(
      (option) => Number(option.id) === Number(bank.id),
    );

    if (exists) return;

    this.bankOptions = [
      ...this.bankOptions,
      {
        id: bank.id,
        name: bank.name,
      },
    ];
  }

  private getCatalogValue(
    value: Catalog | number | string | null,
  ): string | number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    return value.id;
  }

  private getNumberId(value: unknown): number | null {
    const rawId = this.getCatalogValue(
      value as Catalog | number | string | null,
    );

    const id = Number(rawId);

    if (!id || Number.isNaN(id)) return null;

    return id;
  }

  get identityLocked(): boolean {
  return Boolean(
    this.data?.bankAccount?.identity_locked ||
    this.data?.bankAccount?.has_movements_or_files,
  );
}

  // =========================================================
  // CIERRE
  // =========================================================

  closeModal(saved?: boolean): void {
    this.dialogRef.close(!!saved);
  }
}