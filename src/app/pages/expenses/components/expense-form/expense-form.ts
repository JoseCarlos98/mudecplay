import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../../shared/ui/input-date/input-date';
import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../shared/ui/btns-section/btns-section';

import { ExpenseService } from '../../services/expense.service';
import * as entity from '../../interfaces/expense-interfaces';
import {
  toCatalogAutoComplete,
  toIdForm,
} from '../../../../shared/helpers/general-helpers';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { DialogService } from '../../../../shared/services/dialog.service';
import { MatTooltipModule } from '@angular/material/tooltip';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [
    CommonModule,
    MatDatepickerModule,
    ModuleHeader,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    Autocomplete,
    InputField,
    BtnsSection,
    InputDate,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
  ],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss',
})
export class ExpenseForm implements OnInit {
  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly activatedroute = inject(ActivatedRoute);
  private readonly expenseService = inject(ExpenseService);
  private readonly fb = inject(FormBuilder);
  private readonly dialogService = inject(DialogService);
  readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;

  // bandera XML
  isXmlImport: boolean = false;

  // bandera Mano de Obra
  isLaborAuto: boolean = false;

  // uuid CFDI cuando viene de XML
  cfdiUuidFromXml: string | null = null;

  // contador visual de la cola de XML
  xmlQueueTotal: number = 0;
  xmlQueuePending: number = 0;

  // Formulario reactivo principal
  form: FormGroup = this.fb.group({
    date: this.fb.control<string | null>(null, {
      validators: Validators.required,
    }),
    supplier_id: this.fb.control<Catalog | null>(null),
    supplier_display: this.fb.control<string>({ value: '', disabled: true }),
    items: this.fb.array([this.createItemGroup()]),
  });

  bulkProjectCtrl = this.fb.control<any>(null);
  bulkProjectSelected: Catalog | null = null;

  expenseId: number = 0;
  formData!: entity.ExpenseDetail;

  get currentXmlIndex(): number {
    if (!this.xmlQueueTotal) return 1;
    return this.xmlQueueTotal - this.xmlQueuePending;
  }

  ngOnInit() {
    const idParam = this.activatedroute.snapshot.paramMap.get('id');

    if (idParam) {
      this.expenseId = +idParam;
      this.loadExpense(this.expenseId);
    } else {
      if (this.expenseService.hasMoreXmlDrafts()) {
        this.loadNextXmlFromQueueOrExit();
      }
    }

    this.bulkProjectCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (v == null || v === '') {
          this.bulkProjectSelected = null;
        }
      });
  }

  // ==========================
  //  HELPERS
  // ==========================
  private getTodayIsoDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  get itemsFA(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get hasAnySelected(): boolean {
    return this.itemsFA.controls.some((ctrl) => !!ctrl.get('selected')?.value);
  }

  get allSelected(): boolean {
    if (!this.itemsFA.length) return false;
    return this.itemsFA.controls.every((ctrl) => !!ctrl.get('selected')?.value);
  }

  get isSpecialReadonlyExpense(): boolean {
    return this.isXmlImport || this.isLaborAuto;
  }

  // ==========================
  //  CARGAR GASTO (EDICIÓN)
  // ==========================
  loadExpense(id: number) {
    this.expenseService.getById(id).subscribe({
      next: (response: entity.ExpenseDetail) => {
        this.formData = response;

        const anyResp: any = response as any;

        this.isXmlImport = !!anyResp.cfdi_uuid;
        this.cfdiUuidFromXml = anyResp.cfdi_uuid ?? null;

        this.isLaborAuto = anyResp.origin_type === 'labor_auto';

        this.form.patchValue({
          date: response.date,
          supplier_id: response.supplier
            ? toCatalogAutoComplete(
              response.supplier.id,
              response.supplier.company_name,
            )
            : null,
          supplier_display: this.isLaborAuto
            ? (response.provider_display_name ?? '')
            : '',
        });

        const itemsFGs = response.items.map((item) =>
          this.createItemGroup({
            amount: item.amount,
            payment_amount: item.payment_amount ?? null,
            payment_date: item.payment_date ?? null,

            base_amount: (item as any).base_amount ?? null,
            discount_amount: (item as any).discount_amount ?? null,
            tax_amount: (item as any).tax_amount ?? null,
            withheld_amount: (item as any).withheld_amount ?? null,

            project_id: item.project
              ? toCatalogAutoComplete(item.project.id, item.project.name)
              : null,
            product_id: item.product
              ? toCatalogAutoComplete(item.product.id, item.product.name)
              : null,
            product_display: (item as any).product_display_name ?? '',
          } as any),
        );

        this.form.setControl('items', this.fb.array(itemsFGs));

        if (this.isXmlImport) {
          this.applyXmlLocking();
        }

        if (this.isLaborAuto) {
          this.applyLaborAutoLocking();
        }
      },
      error: (err) => console.error('Error al cargar gastos:', err),
    });
  }

  // ==========================
  //  CARGAR DESDE XML (CREACIÓN)
  // ==========================
  patchFormFromXmlDraft(draft: entity.XmlExpenseDraftDto) {
    this.isXmlImport = true;
    this.isLaborAuto = false;
    this.cfdiUuidFromXml = draft.uuid;

    this.form.patchValue({
      date: draft.date,
      supplier_id: draft.supplier
        ? toCatalogAutoComplete(draft.supplier.id, draft.supplier.name)
        : null,
      supplier_display: '',
    });

    const itemsFGs = draft.items.map((item) =>
      this.createItemGroup({
        amount: item.amount,
        payment_amount: item.payment_amount ?? null,
        payment_date: item.payment_date ?? null,

        base_amount: (item as any).base_amount ?? null,
        discount_amount: (item as any).discount_amount ?? null,
        tax_amount: (item as any).tax_amount ?? null,
        withheld_amount: (item as any).withheld_amount ?? null,

        project_id: null,
        product_id: item.product
          ? toCatalogAutoComplete(item.product.id, item.product.name)
          : null,
      } as any),
    );

    this.form.setControl('items', this.fb.array(itemsFGs));
    this.applyXmlLocking();
  }

  // ==========================
  //  BLOQUEOS
  // ==========================
  applyXmlLocking(): void {
    if (!this.isXmlImport) return;

    this.form.get('date')?.disable();
    this.form.get('supplier_id')?.disable();

    this.itemsFA.controls.forEach((ctrl) => {
      ctrl.get('product_id')?.disable();
      ctrl.get('amount')?.disable();

      ctrl.get('base_amount')?.disable();
      ctrl.get('discount_amount')?.disable();
      ctrl.get('tax_amount')?.disable();
      ctrl.get('withheld_amount')?.disable();
    });
  }

  applyLaborAutoLocking(): void {
    if (!this.isLaborAuto) return;

    this.form.get('supplier_id')?.disable({ emitEvent: false });
    this.form.get('supplier_display')?.disable({ emitEvent: false });

    this.itemsFA.controls.forEach((ctrl) => {
      const productCtrl = ctrl.get('product_id');
      const productDisplayCtrl = ctrl.get('product_display');
      const amountCtrl = ctrl.get('amount');
      const paymentAmountCtrl = ctrl.get('payment_amount');
      const paymentDateCtrl = ctrl.get('payment_date');

      productCtrl?.clearValidators();
      productCtrl?.updateValueAndValidity({ emitEvent: false });
      productCtrl?.disable({ emitEvent: false });

      productDisplayCtrl?.disable({ emitEvent: false });

      amountCtrl?.disable({ emitEvent: false });
      paymentAmountCtrl?.disable({ emitEvent: false });
      paymentDateCtrl?.disable({ emitEvent: false });
    });
  }
  // ==========================
  //  CREATE
  // ==========================
  saveData() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayloadFromForm();

    this.expenseService.create(payload).subscribe({
      next: (response) => {
        if (!response.success) return;

        if (this.isXmlImport && this.expenseService.hasMoreXmlDrafts()) {
          this.loadNextXmlFromQueueOrExit();
          return;
        }

        this.expenseService.clearXmlQueue();
        this.router.navigateByUrl('/gastos');
      },
      error: (err) => console.error('Error al crear gasto:', err),
    });
  }

  // ==========================
  //  UPDATE
  // ==========================
  updateData() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayloadFromForm();

    this.expenseService.update(this.expenseId, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigateByUrl('/gastos');
        }
      },
      error: (err) => console.error('Error al actualizar gasto:', err),
    });
  }

  // ==========================
  //  ITEMS FORM
  // ==========================
  createItemGroup(data?: any): FormGroup {
    const defaultPaymentDate = data?.payment_date ?? this.getTodayIsoDate();

    return this.fb.group({
      amount: [data?.amount ?? null, [Validators.required, Validators.min(0.01)]],

      base_amount: [data?.base_amount ?? null],
      discount_amount: [data?.discount_amount ?? null],
      tax_amount: [data?.tax_amount ?? null],
      withheld_amount: [data?.withheld_amount ?? null],

      payment_amount: [data?.payment_amount ?? null],
      payment_date: [defaultPaymentDate],
      project_id: this.fb.control<Catalog | null>(data?.project_id ?? null),
      product_id: this.fb.control<Catalog | null>(data?.product_id ?? null, {
        validators: Validators.required,
      }),
      product_display: this.fb.control<string>(
        { value: data?.product_display ?? '', disabled: true },
      ),
      selected: this.fb.control<boolean>(false),
    });
  }

  addItem() {
    if (this.isXmlImport || this.isLaborAuto) return;
    this.itemsFA.push(this.createItemGroup());
  }

  removeItem(index: number) {
    if (this.itemsFA.length <= 1) return;
    if (this.isXmlImport || this.isLaborAuto) return;
    this.itemsFA.removeAt(index);
  }

  // ==========================
  //  SELECCIÓN MASIVA
  // ==========================
  onToggleSelectAll(checked: boolean): void {
    this.itemsFA.controls.forEach((ctrl) => {
      ctrl.get('selected')?.setValue(checked);
    });
  }

  onBulkProjectSelected(p: Catalog) {
    this.bulkProjectSelected = p;
  }

  applyBulkProject(): void {
    const project = this.bulkProjectSelected;
    if (!project) return;

    this.itemsFA.controls.forEach((ctrl) => {
      if (ctrl.get('selected')?.value) {
        ctrl.get('project_id')?.setValue(project);
        ctrl.get('project_id')?.markAsDirty();
        ctrl.get('project_id')?.markAsTouched();
      }
    });
  }

  // ==========================
  //  HEADER
  // ==========================
  onHeaderAction(action: ModuleHeaderAction | string) {
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

  // ==========================
  //  FOOTER
  // ==========================
  onFooterAction(action: ModuleFooterAction | string) {
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

  // ==========================
  //  PAYLOAD BACKEND
  // ==========================
  buildPayloadFromForm(): entity.CreateExpense {
    const raw = this.form.getRawValue();

    return {
      date: raw.date!,
      supplier_id: toIdForm(raw.supplier_id),
      cfdi_uuid: this.cfdiUuidFromXml ?? null,

      items: (raw.items ?? []).map((item: any): entity.CreateExpenseItem => ({
        amount: Number(item.amount),

        base_amount:
          item.base_amount !== null &&
            item.base_amount !== undefined &&
            item.base_amount !== ''
            ? Number(item.base_amount)
            : null,

        discount_amount:
          item.discount_amount !== null &&
            item.discount_amount !== undefined &&
            item.discount_amount !== ''
            ? Number(item.discount_amount)
            : null,

        tax_amount:
          item.tax_amount !== null &&
            item.tax_amount !== undefined &&
            item.tax_amount !== ''
            ? Number(item.tax_amount)
            : null,

        withheld_amount:
          item.withheld_amount !== null &&
            item.withheld_amount !== undefined &&
            item.withheld_amount !== ''
            ? Number(item.withheld_amount)
            : null,

        payment_amount:
          item.payment_amount !== null && item.payment_amount !== ''
            ? Number(item.payment_amount)
            : null,

        payment_date:
          item.amount == item.payment_amount ? item.payment_date : null,

        project_id: toIdForm(item.project_id),
        product_id: toIdForm(item.product_id),
      })),
    };
  }

  loadNextXmlFromQueueOrExit() {
    const nextDraft = this.expenseService.consumeNextXmlDraft();

    if (!nextDraft) {
      this.expenseService.clearXmlQueue();
      this.isXmlImport = false;
      this.isLaborAuto = false;
      this.cfdiUuidFromXml = null;
      this.router.navigateByUrl('/gastos');
      return;
    }

    this.form.reset();
    this.form.setControl('items', this.fb.array([this.createItemGroup()]));

    this.patchFormFromXmlDraft(nextDraft);

    const status = this.expenseService.getXmlQueueStatus();
    this.xmlQueueTotal = status.total;
    this.xmlQueuePending = status.pending;

    this.bulkProjectCtrl.setValue(null, { emitEvent: true });
    this.bulkProjectSelected = null;
  }

  confirmExitFromXmlFlow() {
    const pendingText =
      this.xmlQueuePending > 0
        ? `Tienes ${this.xmlQueuePending} CFDI pendiente(s) por registrar.\n\n`
        : '';

    this.dialogService
      .confirm({
        size: 'small',
        title: 'Salir del registro desde XML',
        message:
          `${pendingText}` +
          'Si sales ahora, este CFDI y los pendientes no se registrarán como gastos. ' +
          'Podrás volver a subir los XML cuando quieras.\n\n' +
          '¿Quieres salir de todos modos?',
        confirmText: 'Salir sin guardar',
        cancelText: 'Seguir capturando',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.expenseService.clearXmlQueue();
        this.navigateToList();
      });
  }

  buildDiscountTooltip(itemCtrl: any): string {
    const base = Number(itemCtrl.get('base_amount')?.value ?? 0);
    const discount = Number(itemCtrl.get('discount_amount')?.value ?? 0);
    const tax = Number(itemCtrl.get('tax_amount')?.value ?? 0);
    const total = Number(itemCtrl.get('amount')?.value ?? 0);

    const money = (n: number) =>
      `$${n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    return [
      `Base: ${money(base)}`,
      `Descuento: -${money(discount)}`,
      `IVA: ${money(tax)}`,
      `Total: ${money(total)}`,
    ].join('\n');
  }

  buildWithheldTooltip(itemCtrl: any): string {
    const base = Number(itemCtrl.get('base_amount')?.value ?? 0);
    const discount = Number(itemCtrl.get('discount_amount')?.value ?? 0);
    const tax = Number(itemCtrl.get('tax_amount')?.value ?? 0);
    const withheld = Number(itemCtrl.get('withheld_amount')?.value ?? 0);
    const total = Number(itemCtrl.get('amount')?.value ?? 0);

    const money = (n: number) =>
      `$${n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    return [
      `Base: ${money(base)}`,
      discount > 0 ? `Descuento: -${money(discount)}` : null,
      `IVA: ${money(tax)}`,
      `Retención: -${money(withheld)}`,
      `Total: ${money(total)}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  navigateToList() {
    this.router.navigateByUrl('/gastos');
  }
}