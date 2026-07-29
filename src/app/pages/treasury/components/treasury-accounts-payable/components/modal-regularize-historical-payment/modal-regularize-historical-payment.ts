import { CommonModule } from '@angular/common';

import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';

import { MatIconModule } from '@angular/material/icon';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import { finalize } from 'rxjs';

// UI compartida
import {
  ModuleHeader,
} from '../../../../../../shared/ui/module-header/module-header';

import {
  ModuleHeaderConfig,
} from '../../../../../../shared/ui/module-header/interfaces/module-header-interface';

import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../../shared/ui/btns-section/btns-section';

import {
  InputField,
} from '../../../../../../shared/ui/input-field/input-field';

import {
  InputSelect,
} from '../../../../../../shared/ui/input-select/input-select';

import {
  LoadingOverlay,
} from '../../../../../../shared/ui/loading-overlay/loading-overlay';

// Interfaces compartidas
import {
  Catalog,
} from '../../../../../../shared/interfaces/general-interfaces';

// Servicios compartidos
import {
  CatalogsService,
} from '../../../../../../shared/services/catalogs.service';

import {
  DialogService,
} from '../../../../../../shared/services/dialog.service';

// Módulo
import * as entity from '../../interfaces/treasury-accounts-payable.interfaces';

import {
  TreasuryAccountsPayableService,
} from '../../services/treasury-accounts-payable.service';

// =========================================================
// CONFIGURACIÓN
// =========================================================

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

const REGULARIZATION_TYPE_OPTIONS: Catalog[] = [
  {
    id: 'bank_transfer_matched',
    name: 'Transferencia conciliada',
  },
  {
    id: 'historical_transfer_without_movement',
    name: 'Transferencia sin movimiento',
  },
  {
    id: 'cash',
    name: 'Efectivo',
  },
];

@Component({
  selector:
    'app-modal-regularize-historical-payment',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatIconModule,

    ModuleHeader,
    BtnsSection,
    InputField,
    InputSelect,
    LoadingOverlay,
  ],

  templateUrl:
    './modal-regularize-historical-payment.html',

  styleUrl:
    './modal-regularize-historical-payment.scss',
})
export class ModalRegularizeHistoricalPayment
  implements OnInit {

  // =========================================================
  // INYECCIONES
  // =========================================================

  readonly data =
    inject<
      entity.TreasuryRegularizeHistoricalPaymentModalData
    >(MAT_DIALOG_DATA);

  private readonly dialogRef =
    inject(
      MatDialogRef<
        ModalRegularizeHistoricalPayment
      >,
    );

  private readonly accountsPayableService =
    inject(TreasuryAccountsPayableService);

  private readonly catalogsService =
    inject(CatalogsService);

  private readonly dialogService =
    inject(DialogService);

  private readonly fb =
    inject(FormBuilder);

  private readonly destroyRef =
    inject(DestroyRef);

  // =========================================================
  // UI
  // =========================================================

  readonly headerConfig =
    HEADER_CONFIG;

  readonly regularizationTypeOptions =
    REGULARIZATION_TYPE_OPTIONS;

  readonly loadingCatalogs =
    signal(false);

  readonly loadingMovements =
    signal(false);

  readonly saving =
    signal(false);

  companyOptions: Catalog[] = [];

  bankMovementOptions: Catalog[] = [];

  private readonly bankMovementById =
    new Map<
      string,
      entity.TreasuryAvailableOutflow
    >();

  private movementsLoaded = false;

  // =========================================================
  // FORMULARIO
  // =========================================================

  readonly form =
    this.fb.group({
      regularization_type:
        this.fb.control<
          entity.TreasuryHistoricalRegularizationType
          | ''
        >(
          '',
          {
            nonNullable: true,

            validators: [
              Validators.required,
            ],
          },
        ),

      company_id:
        this.fb.control<
          Catalog
          | number
          | string
          | null
        >(null),

      bank_movement_id:
        this.fb.control<
          Catalog
          | number
          | string
          | null
        >(null),

      reference:
        this.fb.control<string>(
          '',
          {
            nonNullable: true,

            validators: [
              Validators.maxLength(180),
            ],
          },
        ),

      reason:
        this.fb.control<string>(
          '',
          {
            nonNullable: true,

            validators: [
              Validators.required,
              Validators.minLength(5),
              Validators.maxLength(500),
            ],
          },
        ),
    });

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.loadCompanies();

    this.form.controls
      .regularization_type
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(
        (
          type:
            | entity.TreasuryHistoricalRegularizationType
            | '',
        ) => {
          this.handleRegularizationTypeChange(
            type,
          );
        },
      );
  }

  // =========================================================
  // INFORMACIÓN DEL PAGO
  // =========================================================

  get payment():
    entity.TreasuryHistoricalPaymentTableRow {
    return this.data.payment;
  }

  get paymentAmount(): number {
    return Number(
      this.payment.amount || 0,
    );
  }

  get folioDisplay(): string {
    return (
      this.payment.internal_folio ||
      this.payment.expense?.internal_folio ||
      'Sin folio'
    );
  }

  get paymentDateDisplay(): string {
    return this.formatDate(
      this.payment.payment_date,
    );
  }

  get supplierDisplay(): string {
    return (
      this.payment.supplier_display_name ||
      this.payment.supplier?.display_name ||
      'Sin proveedor'
    );
  }

  get projectDisplay(): string {
    return (
      this.payment.project_name ||
      this.payment.project?.name ||
      'Sin proyecto'
    );
  }

  get conceptDisplay(): string {
    return (
      this.payment.concept ||
      this.payment.expense_item?.concept ||
      'Sin concepto'
    );
  }

  // =========================================================
  // TIPO SELECCIONADO
  // =========================================================

  get regularizationType():
    | entity.TreasuryHistoricalRegularizationType
    | '' {
    return (
      this.form.controls
        .regularization_type
        .value
    );
  }

  get isMatchedTransfer(): boolean {
    return (
      this.regularizationType ===
      'bank_transfer_matched'
    );
  }

  get isTransferWithoutMovement(): boolean {
    return (
      this.regularizationType ===
      'historical_transfer_without_movement'
    );
  }

  get isCash(): boolean {
    return (
      this.regularizationType ===
      'cash'
    );
  }

  get showCompanySelector(): boolean {
    return (
      this.isTransferWithoutMovement ||
      this.isCash
    );
  }

  get selectedBankMovement():
    entity.TreasuryAvailableOutflow | null {
    const movementId =
      this.getStringId(
        this.form.controls
          .bank_movement_id
          .value,
      );

    if (!movementId) {
      return null;
    }

    return (
      this.bankMovementById.get(
        movementId,
      ) ?? null
    );
  }

  get selectedMovementReference(): string {
    const movement =
      this.selectedBankMovement;

    if (!movement) {
      return 'Sin movimiento';
    }

    return this.getMovementReference(
      movement,
    );
  }

  get selectedMovementAccount(): string {
    const movement =
      this.selectedBankMovement;

    if (!movement) {
      return 'Sin cuenta';
    }

    const alias =
      movement.bank_account
        ?.alias
        ?.trim();

    const identifier =
      movement.bank_account
        ?.account_identifier
        ?.trim();

    if (alias && identifier) {
      return `${alias} · ${identifier}`;
    }

    return (
      alias ||
      identifier ||
      'Sin cuenta'
    );
  }

  get canSave(): boolean {
    if (
      this.saving() ||
      this.form.invalid ||
      !this.payment?.payment_id
    ) {
      return false;
    }

    if (
      this.isMatchedTransfer &&
      !this.selectedBankMovement
    ) {
      return false;
    }

    return true;
  }

  // =========================================================
  // CATÁLOGOS
  // =========================================================

  private loadCompanies(): void {
    if (this.loadingCatalogs()) {
      return;
    }

    this.loadingCatalogs.set(true);

    this.catalogsService
      .treasuryCompaniesCatalog()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.loadingCatalogs.set(false),
        ),
      )
      .subscribe({
        next: (
          companies: Catalog[],
        ) => {
          this.companyOptions =
            companies ?? [];
        },

        error: (error: unknown) => {
          console.error(
            'Error cargando empresas para regularización:',
            error,
          );
        },
      });
  }

  private loadAvailableMovements(): void {
    if (
      this.loadingMovements() ||
      this.movementsLoaded
    ) {
      return;
    }

    this.loadingMovements.set(true);

    this.accountsPayableService
      .getAvailableOutflows({
        page: 1,
        limit: 100,

        search: '',

        company_id: null,
        bank_id: null,
        bank_account_id: null,

        date_from: null,
        date_to: null,
      })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.loadingMovements.set(false),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryAvailableOutflowsResponse,
        ) => {
          this.movementsLoaded = true;

          this.bankMovementById.clear();

          const movements =
            response.data ?? [];

          for (
            const movement of movements
          ) {
            this.bankMovementById.set(
              String(movement.id),
              movement,
            );
          }

          this.bankMovementOptions =
            movements.map(
              (
                movement:
                  entity.TreasuryAvailableOutflow,
              ): Catalog => ({
                id:
                  String(movement.id),

                name:
                  this.getMovementOptionLabel(
                    movement,
                  ),
              }),
            );
        },

        error: (error: unknown) => {
          console.error(
            'Error cargando movimientos bancarios disponibles:',
            error,
          );
        },
      });
  }

  // =========================================================
  // TIPO DE REGULARIZACIÓN
  // =========================================================

  private handleRegularizationTypeChange(
    type:
      | entity.TreasuryHistoricalRegularizationType
      | '',
  ): void {
    const bankMovementControl =
      this.form.controls
        .bank_movement_id;

    if (
      type ===
      'bank_transfer_matched'
    ) {
      this.form.controls
        .company_id
        .setValue(
          null,
          {
            emitEvent: false,
          },
        );

      bankMovementControl.setValidators([
        Validators.required,
      ]);

      this.loadAvailableMovements();
    } else {
      bankMovementControl.clearValidators();

      bankMovementControl.setValue(
        null,
        {
          emitEvent: false,
        },
      );
    }

    bankMovementControl
      .updateValueAndValidity({
        emitEvent: false,
      });
  }

  // =========================================================
  // GUARDAR
  // =========================================================

  saveData(): void {
    if (
      this.saving() ||
      !this.canSave
    ) {
      this.form.markAllAsTouched();
      return;
    }

    const value =
      this.form.getRawValue();

    const regularizationType =
      value.regularization_type;

    const reason =
      value.reason.trim();

    const reference =
      value.reference.trim();

    if (
      !regularizationType ||
      reason.length < 5 ||
      reason.length > 500 ||
      reference.length > 180
    ) {
      this.form.markAllAsTouched();
      return;
    }

    const payload:
      entity.TreasuryRegularizeHistoricalPaymentPayload = {
      regularization_type:
        regularizationType,

      reason,
    };

    if (reference) {
      payload.reference =
        reference;
    }

    if (
      regularizationType ===
      'bank_transfer_matched'
    ) {
      const movementId =
        this.getStringId(
          value.bank_movement_id,
        );

      if (!movementId) {
        this.form.markAllAsTouched();
        return;
      }

      payload.bank_movement_id =
        movementId;
    } else {
      const companyId =
        this.getNumberId(
          value.company_id,
        );

      if (companyId) {
        payload.company_id =
          companyId;
      }
    }

    this.saving.set(true);

    this.accountsPayableService
      .regularizeHistoricalPayment(
        this.payment.payment_id,
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() =>
          this.saving.set(false),
        ),
      )
      .subscribe({
        next: (
          response:
            entity.TreasuryRegularizeHistoricalPaymentResponse,
        ) => {
          if (!response.success) {
            return;
          }

          this.dialogRef.close(
            response,
          );
        },

        error: (error: unknown) => {
          console.error(
            'Error al regularizar el pago histórico:',
            error,
          );

          this.showError(
            this.resolveErrorMessage(
              error,
            ),
          );
        },
      });
  }

  // =========================================================
  // BTN SECTION
  // =========================================================

  onBtnsSectionAction(
    action: ModuleFooterAction,
  ): void {
    switch (action) {
      case 'cancel':
        this.closeModal();
        break;

      default:
        break;
    }
  }

  // =========================================================
  // MODAL
  // =========================================================

  closeModal(): void {
    if (this.saving()) {
      return;
    }

    this.dialogRef.close(null);
  }

  // =========================================================
  // HELPERS
  // =========================================================

  formatDate(
    value:
      | string
      | null
      | undefined,
  ): string {
    if (!value) {
      return 'Sin fecha';
    }

    const normalized =
      String(value)
        .slice(0, 10);

    const parts =
      normalized.split('-');

    if (parts.length !== 3) {
      return normalized;
    }

    const [
      year,
      month,
      day,
    ] = parts;

    return `${day}/${month}/${year}`;
  }

  private getMovementOptionLabel(
    movement:
      entity.TreasuryAvailableOutflow,
  ): string {
    const date =
      this.formatDate(
        movement.movement_date,
      );

    const reference =
      this.getMovementReference(
        movement,
      );

    const company =
      movement.company?.name ||
      'Empresa no identificada';

    const amount =
      new Intl.NumberFormat(
        'es-MX',
        {
          style: 'currency',
          currency: 'MXN',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      ).format(
        Number(
          movement.available_amount || 0,
        ),
      );

    return (
      `${date} · ${reference} · ` +
      `${company} · Disponible ${amount}`
    );
  }

  private getMovementReference(
    movement:
      entity.TreasuryAvailableOutflow,
  ): string {
    return (
      movement.bank_reference?.trim() ||
      movement.receipt_number?.trim() ||
      movement.tracking_key?.trim() ||
      `Movimiento ${movement.id}`
    );
  }

  private getCatalogValue(
    value:
      | Catalog
      | number
      | string
      | null
      | undefined,
  ): string | number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    if (
      typeof value === 'number' ||
      typeof value === 'string'
    ) {
      return value;
    }

    return value.id;
  }

  private getNumberId(
    value:
      | Catalog
      | number
      | string
      | null
      | undefined,
  ): number | null {
    const raw =
      this.getCatalogValue(
        value,
      );

    const id =
      Number(raw);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return null;
    }

    return id;
  }

  private getStringId(
    value:
      | Catalog
      | number
      | string
      | null
      | undefined,
  ): string | null {
    const raw =
      this.getCatalogValue(
        value,
      );

    if (
      raw === null ||
      raw === undefined
    ) {
      return null;
    }

    const id =
      String(raw).trim();

    return /^[1-9]\d*$/.test(id)
      ? id
      : null;
  }

  private showError(
    message: string,
  ): void {
    this.dialogService
      .confirm({
        title:
          'No se pudo regularizar el pago',

        message,

        confirmText:
          'Aceptar',

        cancelText:
          '',
      })
      .subscribe();
  }

  private resolveErrorMessage(
    error: unknown,
  ): string {
    const backendMessage =
      (
        error as {
          error?: {
            message?:
              | string
              | string[];
          };
        }
      )?.error?.message;

    if (
      Array.isArray(
        backendMessage,
      )
    ) {
      return backendMessage.join(
        '\n',
      );
    }

    if (
      typeof backendMessage ===
        'string' &&
      backendMessage.trim()
    ) {
      return backendMessage.trim();
    }

    return (
      'No fue posible regularizar el pago histórico.'
    );
  }
}