import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../shared/ui/btns-section/btns-section';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { InputDate } from '../../../../shared/ui/input-date/input-date';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';

import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import {
  toCatalogAutoComplete,
  toIdForm,
} from '../../../../shared/helpers/general-helpers';

import { CatalogsService } from '../../../../shared/services/catalogs.service';
import { DialogService } from '../../../../shared/services/dialog.service';
import { ExpenseService } from '../../services/expense.service';

import * as entity from '../../interfaces/expense-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    // UI
    ModuleHeader,
    BtnsSection,
    Autocomplete,
    InputField,
    InputDate,
    InputSelect,

    // Material
    MatDatepickerModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
  ],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss',
})
export class ExpenseForm implements OnInit {
  private readonly expenseService = inject(ExpenseService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly dialogService = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly headerConfig = HEADER_CONFIG;

  measurementUnitsCatalog: Catalog[] = [];

  isXmlImport = false;
  isLaborAuto = false;
  hasWarehouseItems = false;

  isPurchaseOrderLinkedExpense = false;

  cfdiUuidFromXml: string | null = null;

  xmlQueueTotal = 0;
  xmlQueuePending = 0;

  expenseId = 0;
  formData!: entity.ExpenseDetail;

  bulkProjectCtrl = this.fb.control<any>(null);
  bulkProjectSelected: Catalog | null = null;

  bulkAmountCtrl = this.fb.control<number | null>(null);
  bulkPaymentDateCtrl = this.fb.control<string | null>('');

  form: FormGroup = this.fb.group({
    date: this.fb.control<string | null>(null, {
      validators: Validators.required,
    }),
    supplier_id: this.fb.control<Catalog | null>(null),
    supplier_display: this.fb.control<string>({ value: '', disabled: true }),
    items: this.fb.array([this.createItemGroup()]),
  });

  // ==========================
  //  GETTERS
  // ==========================

  get currentXmlIndex(): number {
    if (!this.xmlQueueTotal) return 1;
    return this.xmlQueueTotal - this.xmlQueuePending;
  }

  get itemsFA(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get hasAnySelected(): boolean {
    return this.itemsFA.controls.some((ctrl) => !!ctrl.get('selected')?.value);
  }

  get hasAnySelectedDirect(): boolean {
    return this.itemsFA.controls.some(
      (ctrl) => !!ctrl.get('selected')?.value && !this.isWarehouseItem(ctrl),
    );
  }

  get allSelected(): boolean {
    if (!this.itemsFA.length) return false;
    return this.itemsFA.controls.every((ctrl) => !!ctrl.get('selected')?.value);
  }

  get isPurchaseOrderProjectLocked(): boolean {
    return !!this.expenseId && this.isPurchaseOrderLinkedExpense;
  }

  get isSpecialReadonlyExpense(): boolean {
    return this.isXmlImport || this.isLaborAuto;
  }

  get isWarehouseSafeExpense(): boolean {
    return !!this.expenseId && this.hasWarehouseItems;
  }

  get canApplyAmountToSelection(): boolean {
    const amount = Number(this.bulkAmountCtrl.value ?? 0);

    return (
      !this.isXmlImport &&
      !this.isLaborAuto &&
      !this.isWarehouseSafeExpense &&
      this.hasAnySelectedDirect &&
      amount > 0
    );
  }

  get canApplyFullPaymentToSelection(): boolean {
    return (
      !this.isLaborAuto &&
      this.hasAnySelected &&
      !!this.bulkPaymentDateCtrl.value
    );
  }

  // ==========================
  //  CICLO DE VIDA
  // ==========================

  /**
   * Inicializa catálogos, carga gasto si viene id o continúa cola XML.
   */
  ngOnInit(): void {
    this.loadCatalogs();

    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.expenseId = Number(idParam);
      this.loadExpense(this.expenseId);
    } else if (this.expenseService.hasMoreXmlDrafts()) {
      this.loadNextXmlFromQueueOrExit();
    }

    this.bulkProjectCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value == null || value === '') {
          this.bulkProjectSelected = null;
        }
      });
  }

  // ==========================
  //  CATÁLOGOS
  // ==========================

  /**
   * Carga catálogo de unidades de medida para items de almacén.
   */
  private loadCatalogs(): void {
    this.catalogsService.measurementUnitsCatalog().subscribe({
      next: (response) => {
        this.measurementUnitsCatalog = response;
      },
      error: (err) => console.error('Error al cargar unidades de medida:', err),
    });
  }

  // ==========================
  //  HELPERS GENERALES
  // ==========================

  /**
   * Regresa la fecha actual en formato ISO yyyy-mm-dd.
   */
  private getTodayIsoDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Formatea monto como moneda MXN.
   */
  formatMoney(amount: number): string {
    return amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Convierte un valor a número o null.
   */
  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;

    const num = Number(value);

    return Number.isFinite(num) ? num : null;
  }

  /**
   * Redondea a 2 decimales.
   */
  private round2(value: number): number {
    return Number(Number(value ?? 0).toFixed(2));
  }

  /**
   * Redondea a 4 decimales.
   */
  private round4(value: number): number {
    return Number(Number(value ?? 0).toFixed(4));
  }

  /**
   * Redondea a 6 decimales.
   */
  private round6(value: number): number {
    return Number(Number(value ?? 0).toFixed(6));
  }

  /**
   * Compara dos montos considerando centavos.
   */
  private isSameMoney(a: any, b: any): boolean {
    const n1 = this.round2(Number(a ?? 0));
    const n2 = this.round2(Number(b ?? 0));

    return Math.abs(n1 - n2) <= 0.01;
  }

  /**
   * Asigna valor sin disparar eventos y deja el control limpio.
   */
  private setSilentControlValue(
    ctrl: AbstractControl,
    controlName: string,
    value: any,
  ): void {
    const control = ctrl.get(controlName);

    if (!control) return;

    control.setValue(value, { emitEvent: false });
    control.markAsPristine();
    control.markAsUntouched();
    control.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Normaliza texto para buscar coincidencias de catálogo.
   */
  private normalizeCatalogText(value: any): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[().,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ==========================
  //  XML - CÁLCULOS FISCALES
  // ==========================

  /**
   * Detecta si un item XML tiene descuento total y costo cero.
   */
  isZeroCostXmlDiscountItem(ctrl: AbstractControl): boolean {
    if (!this.isXmlImport) return false;

    const raw = ctrl.getRawValue?.() ?? {};

    return this.isZeroCostXmlDiscountRaw(raw);
  }

  /**
   * Detecta descuento total desde un objeto raw.
   */
  private isZeroCostXmlDiscountRaw(item: any): boolean {
    if (!this.isXmlImport || !item) return false;

    const amount = this.round2(Number(item.amount ?? item.xml_amount ?? 0));
    const baseAmount = this.round2(Number(item.base_amount ?? 0));
    const discountAmount = this.round2(Number(item.discount_amount ?? 0));
    const taxAmount = this.round2(Number(item.tax_amount ?? 0));
    const withheldAmount = this.round2(Number(item.withheld_amount ?? 0));

    const fiscalAmount = this.round2(
      Math.max(0, baseAmount - discountAmount) + taxAmount - withheldAmount,
    );

    return (
      amount === 0 &&
      fiscalAmount === 0 &&
      baseAmount > 0 &&
      discountAmount >= baseAmount &&
      taxAmount === 0 &&
      withheldAmount === 0
    );
  }

  /**
   * Bloquea pago y fecha en productos XML con costo cero.
   */
  private syncZeroCostDiscountPaymentState(ctrl: AbstractControl): void {
    const paymentAmountCtrl = ctrl.get('payment_amount');
    const paymentDateCtrl = ctrl.get('payment_date');

    if (!paymentAmountCtrl || !paymentDateCtrl) return;

    if (this.isZeroCostXmlDiscountItem(ctrl)) {
      paymentAmountCtrl.setValue(0, { emitEvent: false });
      paymentAmountCtrl.disable({ emitEvent: false });
      paymentAmountCtrl.updateValueAndValidity({ emitEvent: false });

      paymentDateCtrl.setValue(null, { emitEvent: false });
      paymentDateCtrl.disable({ emitEvent: false });
      paymentDateCtrl.updateValueAndValidity({ emitEvent: false });

      return;
    }

    if (!this.isLaborAuto) {
      paymentAmountCtrl.enable({ emitEvent: false });
      paymentDateCtrl.enable({ emitEvent: false });
    }
  }

  /**
   * Revisa si el item trae desglose fiscal CFDI.
   */
  private hasFiscalBreakdownFromRawItem(item: any): boolean {
    return (
      item?.base_amount !== null &&
      item?.base_amount !== undefined &&
      item?.base_amount !== ''
    ) || (
        item?.discount_amount !== null &&
        item?.discount_amount !== undefined &&
        item?.discount_amount !== ''
      ) || (
        item?.tax_amount !== null &&
        item?.tax_amount !== undefined &&
        item?.tax_amount !== ''
      ) || (
        item?.withheld_amount !== null &&
        item?.withheld_amount !== undefined &&
        item?.withheld_amount !== ''
      );
  }

  /**
   * Calcula monto final desde base, descuento, IVA y retenciones.
   */
  private resolveFiscalAmountFromRawItem(item: any): number | null {
    if (!this.hasFiscalBreakdownFromRawItem(item)) return null;

    const baseAmount = this.round2(Number(item.base_amount ?? 0));
    const discountAmount = this.round2(Number(item.discount_amount ?? 0));
    const taxAmount = this.round2(Number(item.tax_amount ?? 0));
    const withheldAmount = this.round2(Number(item.withheld_amount ?? 0));
    const netBase = Math.max(0, baseAmount - discountAmount);

    return this.round2(netBase + taxAmount - withheldAmount);
  }

  /**
   * Resuelve el monto correcto de un item XML.
   */
  private resolveXmlAmountFromRawItem(item: any): number | null {
    if (this.isZeroCostXmlDiscountRaw(item)) {
      return 0;
    }

    const fiscalAmount = this.resolveFiscalAmountFromRawItem(item);

    if (fiscalAmount !== null && fiscalAmount > 0) {
      return fiscalAmount;
    }

    const xmlAmount = this.toNumberOrNull(item?.xml_amount);

    if (xmlAmount !== null && xmlAmount > 0) {
      return this.round2(xmlAmount);
    }

    const amount = this.toNumberOrNull(item?.amount);

    return amount !== null && amount > 0 ? this.round2(amount) : null;
  }

  /**
   * Calcula precio unitario desde monto y cantidad.
   */
  private resolveXmlUnitPriceFromAmount(
    amount: number | null,
    quantity: number | null,
  ): number | null {
    if (amount === null || amount < 0 || !quantity || quantity <= 0) {
      return null;
    }

    return this.round6(amount / quantity);
  }

  /**
   * Corrige el abono cuando el XML cambió el monto fiscal real.
   */
  private resolvePayloadPaymentAmount(
    rawPaymentAmount: any,
    normalizedAmount: number,
    currentFormAmount: number | null,
    item?: any,
  ): number | null {
    if (item && this.isZeroCostXmlDiscountRaw(item)) {
      return 0;
    }

    const paymentAmount = this.toNumberOrNull(rawPaymentAmount);

    if (paymentAmount === null) return null;

    const roundedPaymentAmount = this.round2(paymentAmount);

    if (
      this.isXmlImport &&
      normalizedAmount > 0 &&
      currentFormAmount !== null &&
      this.isSameMoney(roundedPaymentAmount, currentFormAmount) &&
      !this.isSameMoney(roundedPaymentAmount, normalizedAmount)
    ) {
      return normalizedAmount;
    }

    return roundedPaymentAmount;
  }

  /**
   * Sincroniza monto y precio unitario desde valores fiscales XML.
   */
  private syncXmlFiscalValues(ctrl: AbstractControl): void {
    if (!this.isXmlImport) return;

    const raw = ctrl.getRawValue?.() ?? {};
    const xmlAmount = this.resolveXmlAmountFromRawItem(raw);

    if (xmlAmount === null) return;

    const quantity =
      this.toNumberOrNull(raw.quantity) ??
      this.toNumberOrNull(raw.xml_quantity);

    const unitPrice = this.resolveXmlUnitPriceFromAmount(
      xmlAmount,
      quantity,
    );

    ctrl.get('amount')?.setValue(xmlAmount, { emitEvent: false });
    ctrl.get('amount')?.updateValueAndValidity({ emitEvent: false });

    if (unitPrice !== null) {
      ctrl.get('unit_price')?.setValue(unitPrice, { emitEvent: false });
      ctrl.get('unit_price')?.updateValueAndValidity({ emitEvent: false });
    }

    this.syncZeroCostDiscountPaymentState(ctrl);

    if (xmlAmount <= 0) return;

    const paymentAmount = this.toNumberOrNull(ctrl.get('payment_amount')?.value);

    if (
      paymentAmount !== null &&
      paymentAmount > 0 &&
      this.isSameMoney(paymentAmount, raw.amount) &&
      !this.isSameMoney(paymentAmount, xmlAmount)
    ) {
      ctrl.get('payment_amount')?.setValue(xmlAmount, { emitEvent: false });
      ctrl.get('payment_amount')?.updateValueAndValidity({ emitEvent: false });
    }
  }

  // ==========================
  //  ALMACÉN - HELPERS UI
  // ==========================

  /**
   * Indica si el item es de almacén.
   */
  isWarehouseItem(ctrl: AbstractControl): boolean {
    return ctrl.get('item_type')?.value === 'warehouse';
  }

  /**
   * Indica si el usuario puede cambiar el tipo de item.
   */
  canChangeItemType(ctrl: AbstractControl): boolean {
    if (this.isLaborAuto) return false;
    if (this.isWarehouseSafeExpense) return false;

    return !!ctrl.get('item_type')?.enabled;
  }

  /**
   * Cambia el tipo de item entre directo y almacén.
   */
  setItemType(index: number, type: entity.ExpenseItemType): void {
    const ctrl = this.itemsFA.at(index) as FormGroup;

    if (!ctrl || !this.canChangeItemType(ctrl)) return;

    const currentType = ctrl.get('item_type')?.value as entity.ExpenseItemType;

    if (currentType === type) return;

    this.resetItemValuesForTypeChange(ctrl, type);

    ctrl.get('item_type')?.setValue(type, { emitEvent: false });
    ctrl.get('item_type')?.markAsDirty();
    ctrl.get('item_type')?.markAsTouched();

    this.refreshItemTypeState(ctrl, false);

    if (type === 'warehouse') {
      ['quantity', 'unit_id', 'unit_price'].forEach((controlName) => {
        const control = ctrl.get(controlName);
        control?.markAsPristine();
        control?.markAsUntouched();
      });
    }

    if (type === 'direct') {
      ['amount'].forEach((controlName) => {
        const control = ctrl.get(controlName);
        control?.markAsPristine();
        control?.markAsUntouched();
      });
    }
  }

  /**
   * Limpia valores incompatibles al cambiar de tipo.
   */
  private resetItemValuesForTypeChange(
    ctrl: AbstractControl,
    nextType: entity.ExpenseItemType,
  ): void {
    this.setSilentControlValue(ctrl, 'payment_amount', null);
    this.setSilentControlValue(ctrl, 'payment_date', null);

    if (nextType === 'warehouse') {
      this.setSilentControlValue(ctrl, 'project_id', null);

      if (this.isXmlImport) {
        const xmlQuantity =
          this.toNumberOrNull(ctrl.get('xml_quantity')?.value) ??
          this.toNumberOrNull(ctrl.get('quantity')?.value);

        const xmlUnit = String(
          ctrl.get('xml_unit')?.value ??
          ctrl.get('unit')?.value ??
          '',
        ).trim();

        const raw = ctrl.getRawValue?.() ?? {};
        const xmlAmount = this.resolveXmlAmountFromRawItem(raw);
        const xmlUnitPrice =
          xmlQuantity && xmlQuantity > 0 && xmlAmount !== null
            ? this.resolveXmlUnitPriceFromAmount(xmlAmount, xmlQuantity)
            : this.toNumberOrNull(ctrl.get('xml_unit_price')?.value) ??
            this.toNumberOrNull(ctrl.get('unit_price')?.value);

        this.setSilentControlValue(ctrl, 'quantity', xmlQuantity ?? null);
        this.setSilentControlValue(ctrl, 'unit', xmlUnit || null);
        this.setSilentControlValue(ctrl, 'unit_price', xmlUnitPrice ?? null);
        this.setSilentControlValue(
          ctrl,
          'amount',
          xmlAmount !== null ? this.round2(xmlAmount) : null,
        );

        const currentUnitId = toIdForm(ctrl.get('unit_id')?.value);

        if (!currentUnitId) {
          const matchedUnitId = this.resolveMeasurementUnitIdFromText(xmlUnit);

          this.setSilentControlValue(
            ctrl,
            'unit_id',
            matchedUnitId ?? null,
          );
        }

        return;
      }

      this.setSilentControlValue(ctrl, 'quantity', null);
      this.setSilentControlValue(ctrl, 'unit', null);
      this.setSilentControlValue(ctrl, 'unit_id', null);
      this.setSilentControlValue(ctrl, 'unit_price', null);
      this.setSilentControlValue(ctrl, 'amount', null);

      return;
    }

    if (this.isXmlImport) {
      const xmlQuantity = this.toNumberOrNull(ctrl.get('xml_quantity')?.value);
      const xmlUnit = String(ctrl.get('xml_unit')?.value ?? '').trim();
      const xmlUnitPrice = this.toNumberOrNull(ctrl.get('xml_unit_price')?.value);
      const xmlAmount = this.toNumberOrNull(ctrl.get('xml_amount')?.value);

      this.setSilentControlValue(ctrl, 'quantity', xmlQuantity ?? null);
      this.setSilentControlValue(ctrl, 'unit', xmlUnit || null);
      this.setSilentControlValue(ctrl, 'unit_id', null);
      this.setSilentControlValue(ctrl, 'unit_price', xmlUnitPrice ?? null);
      this.setSilentControlValue(
        ctrl,
        'amount',
        xmlAmount !== null ? this.round2(xmlAmount) : null,
      );

      return;
    }

    this.setSilentControlValue(ctrl, 'quantity', null);
    this.setSilentControlValue(ctrl, 'unit', null);
    this.setSilentControlValue(ctrl, 'unit_id', null);
    this.setSilentControlValue(ctrl, 'unit_price', null);
    this.setSilentControlValue(ctrl, 'amount', null);
  }

  /**
   * Resuelve unidad de medida por texto del XML.
   */
  private resolveMeasurementUnitIdFromText(
    unitText: string | null | undefined,
  ): number | null {
    const normalizedXmlUnit = this.normalizeCatalogText(unitText);

    if (!normalizedXmlUnit) return null;

    const exactMatch = this.measurementUnitsCatalog.find((unit: any) => {
      const possibleValues = [
        unit.name,
        unit.label,
        unit.display_name,
        unit.description,
        unit.code,
        unit.abbreviation,
        unit.short_name,
      ];

      return possibleValues.some(
        (value) => this.normalizeCatalogText(value) === normalizedXmlUnit,
      );
    });

    if (exactMatch) return Number(exactMatch.id);

    const partialMatch = this.measurementUnitsCatalog.find((unit: any) => {
      const possibleValues = [
        unit.name,
        unit.label,
        unit.display_name,
        unit.description,
        unit.code,
        unit.abbreviation,
        unit.short_name,
      ]
        .map((value) => this.normalizeCatalogText(value))
        .filter(Boolean);

      return possibleValues.some(
        (value) =>
          value.includes(normalizedXmlUnit) ||
          normalizedXmlUnit.includes(value),
      );
    });

    return partialMatch ? Number(partialMatch.id) : null;
  }

  /**
   * Muestra cantidad y unidad inicial para items de almacén.
   */
  getWarehouseInitialText(ctrl: AbstractControl): string {
    const quantity = Number(ctrl.get('quantity')?.value ?? 0);
    const rawUnitId = ctrl.get('unit_id')?.value;

    const unitId =
      toIdForm(rawUnitId) ??
      this.toNumberOrNull(rawUnitId);

    const unitName =
      this.measurementUnitsCatalog.find((unit) => Number(unit.id) === Number(unitId))?.name ??
      String(ctrl.get('unit')?.value ?? '').trim();

    if (!quantity || quantity <= 0) return '0';

    return `${quantity.toLocaleString('es-MX')} ${unitName || ''}`.trim();
  }

  /**
   * Configura listeners de cantidad/precio para recalcular almacén.
   */
  private setupWarehouseItemBehaviour(group: FormGroup): void {
    group
      .get('item_type')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshItemTypeState(group);
      });

    group
      .get('quantity')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.recalculateWarehouseAmount(group);
      });

    group
      .get('unit_price')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.recalculateWarehouseAmount(group);
      });

    this.refreshItemTypeState(group, false);
  }

  /**
   * Activa/desactiva validaciones según tipo de item.
   */
  private refreshItemTypeState(ctrl: AbstractControl, emitEvent = false): void {
    const isWarehouse = this.isWarehouseItem(ctrl);

    const quantityCtrl = ctrl.get('quantity');
    const unitCtrl = ctrl.get('unit');
    const unitIdCtrl = ctrl.get('unit_id');
    const unitPriceCtrl = ctrl.get('unit_price');
    const amountCtrl = ctrl.get('amount');
    const projectCtrl = ctrl.get('project_id');

    if (isWarehouse) {
      const isZeroCostDiscount = this.isZeroCostXmlDiscountItem(ctrl);

      quantityCtrl?.setValidators([Validators.required, Validators.min(0.0001)]);
      unitIdCtrl?.setValidators([Validators.required]);
      unitPriceCtrl?.setValidators([
        Validators.required,
        Validators.min(isZeroCostDiscount ? 0 : 0.000001),
      ]);

      unitCtrl?.clearValidators();

      projectCtrl?.setValue(null, { emitEvent: false });
      projectCtrl?.clearValidators();
      projectCtrl?.disable({ emitEvent: false });

      amountCtrl?.disable({ emitEvent: false });

      this.recalculateWarehouseAmount(ctrl);
    } else {
      quantityCtrl?.clearValidators();
      unitCtrl?.clearValidators();
      unitIdCtrl?.clearValidators();
      unitPriceCtrl?.clearValidators();

      if (
        !this.isLaborAuto &&
        !this.isWarehouseSafeExpense &&
        !this.isPurchaseOrderProjectLocked
      ) {
        projectCtrl?.enable({ emitEvent: false });
      } else {
        projectCtrl?.disable({ emitEvent: false });
      }

      if (!this.isXmlImport && !this.isLaborAuto && !this.isWarehouseSafeExpense) {
        amountCtrl?.enable({ emitEvent: false });
      }
    }

    this.syncZeroCostDiscountPaymentState(ctrl);

    quantityCtrl?.updateValueAndValidity({ emitEvent });
    unitCtrl?.updateValueAndValidity({ emitEvent });
    unitIdCtrl?.updateValueAndValidity({ emitEvent });
    unitPriceCtrl?.updateValueAndValidity({ emitEvent });
    projectCtrl?.updateValueAndValidity({ emitEvent });
    amountCtrl?.updateValueAndValidity({ emitEvent });
  }

  /**
   * Recalcula importe de almacén con cantidad * precio unitario.
   */
  private recalculateWarehouseAmount(ctrl: AbstractControl): void {
    if (!this.isWarehouseItem(ctrl)) return;

    if (this.isXmlImport) {
      this.syncXmlFiscalValues(ctrl);
      return;
    }

    const quantity = Number(ctrl.get('quantity')?.value ?? 0);
    const unitPrice = Number(ctrl.get('unit_price')?.value ?? 0);

    if (quantity > 0 && unitPrice > 0) {
      const amount = this.round2(quantity * unitPrice);

      ctrl.get('amount')?.setValue(amount, { emitEvent: false });
      ctrl.get('amount')?.updateValueAndValidity({ emitEvent: false });

      const paymentAmount = Number(ctrl.get('payment_amount')?.value ?? 0);

      if (paymentAmount > amount) {
        ctrl.get('payment_amount')?.setValue(null, { emitEvent: false });
        ctrl.get('payment_date')?.setValue(this.getTodayIsoDate(), {
          emitEvent: false,
        });
      }
    }
  }

  // ==========================
  //  CARGA DE DATOS
  // ==========================

  /**
   * Carga un gasto existente para editar.
   */
  loadExpense(id: number): void {
    this.expenseService.getById(id).subscribe({
      next: (response: entity.ExpenseDetail) => {
        this.formData = response;

        const anyResp: any = response as any;

        this.isXmlImport = !!anyResp.cfdi_uuid;
        this.cfdiUuidFromXml = anyResp.cfdi_uuid ?? null;
        this.isLaborAuto = anyResp.origin_type === 'labor_auto';

        this.isPurchaseOrderLinkedExpense =
          anyResp.origin_type === 'purchase_order' ||
          anyResp.source_module === 'purchase_orders' ||
          anyResp.source_module === 'purchase_order' ||
          !!anyResp.source_record_id;

        this.hasWarehouseItems = response.items.some(
          (item) => item.item_type === 'warehouse',
        );

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
            id: item.id,
            item_type: item.item_type ?? 'direct',
            quantity: item.quantity ?? null,
            unit: item.unit ?? null,
            unit_id: (item as any).unit_id ?? null,
            unit_price: item.unit_price ?? null,
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

        if (this.isWarehouseSafeExpense) {
          this.applyWarehouseSafeLocking();
        }

        if (this.isPurchaseOrderProjectLocked) {
          this.applyPurchaseOrderProjectLocking();
        }
      },
      error: (err) => console.error('Error al cargar gastos:', err),
    });
  }

  /**
   * Llena el formulario con el siguiente XML de la cola.
   */
  patchFormFromXmlDraft(draft: entity.XmlExpenseDraftDto): void {
    this.isXmlImport = true;
    this.isLaborAuto = false;
    this.hasWarehouseItems = false;
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
        item_type: item.item_type ?? 'direct',
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        unit_id: null,
        unit_price: item.unit_price ?? null,
        xml_quantity: item.quantity ?? null,
        xml_unit: item.unit ?? null,
        xml_unit_price: item.unit_price ?? null,
        xml_amount: item.amount ?? null,
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

  /**
   * Bloquea campos que vienen desde XML.
   */
  applyXmlLocking(): void {
    if (!this.isXmlImport) return;

    this.form.get('date')?.disable();
    this.form.get('supplier_id')?.disable();

    this.itemsFA.controls.forEach((ctrl) => {
      this.syncXmlFiscalValues(ctrl);

      ctrl.get('product_id')?.disable();
      ctrl.get('amount')?.disable();

      ctrl.get('quantity')?.disable({ emitEvent: false });
      ctrl.get('unit')?.disable({ emitEvent: false });
      ctrl.get('unit_price')?.disable({ emitEvent: false });

      ctrl.get('base_amount')?.disable();
      ctrl.get('discount_amount')?.disable();
      ctrl.get('tax_amount')?.disable();
      ctrl.get('withheld_amount')?.disable();

      this.refreshItemTypeState(ctrl, false);
    });
  }

  /**
   * Bloquea campos de gastos generados por mano de obra.
   */
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
      const itemTypeCtrl = ctrl.get('item_type');
      const quantityCtrl = ctrl.get('quantity');
      const unitCtrl = ctrl.get('unit');
      const unitIdCtrl = ctrl.get('unit_id');
      const unitPriceCtrl = ctrl.get('unit_price');

      productCtrl?.clearValidators();
      productCtrl?.updateValueAndValidity({ emitEvent: false });
      productCtrl?.disable({ emitEvent: false });

      productDisplayCtrl?.disable({ emitEvent: false });

      itemTypeCtrl?.disable({ emitEvent: false });
      quantityCtrl?.disable({ emitEvent: false });
      unitCtrl?.disable({ emitEvent: false });
      unitIdCtrl?.disable({ emitEvent: false });
      unitPriceCtrl?.disable({ emitEvent: false });

      amountCtrl?.disable({ emitEvent: false });
      paymentAmountCtrl?.disable({ emitEvent: false });
      paymentDateCtrl?.disable({ emitEvent: false });
    });
  }

  /**
   * Bloquea edición estructural en gastos de almacén ya creados.
   */
  applyWarehouseSafeLocking(): void {
    if (!this.isWarehouseSafeExpense) return;

    this.itemsFA.controls.forEach((ctrl) => {
      ctrl.get('item_type')?.disable({ emitEvent: false });
      ctrl.get('product_id')?.disable({ emitEvent: false });
      ctrl.get('project_id')?.disable({ emitEvent: false });

      ctrl.get('quantity')?.disable({ emitEvent: false });
      ctrl.get('unit')?.disable({ emitEvent: false });
      ctrl.get('unit_id')?.disable({ emitEvent: false });
      ctrl.get('unit_price')?.disable({ emitEvent: false });

      ctrl.get('amount')?.disable({ emitEvent: false });

      ctrl.get('base_amount')?.disable({ emitEvent: false });
      ctrl.get('discount_amount')?.disable({ emitEvent: false });
      ctrl.get('tax_amount')?.disable({ emitEvent: false });
      ctrl.get('withheld_amount')?.disable({ emitEvent: false });
    });
  }


  /**
 * Bloquea el proyecto en gastos relacionados a una orden de compra.
 * El proyecto debe conservarse igual al de la O.C. para no romper trazabilidad.
 */
  applyPurchaseOrderProjectLocking(): void {
    if (!this.isPurchaseOrderProjectLocked) return;

    this.bulkProjectCtrl.disable({ emitEvent: false });
    this.bulkProjectSelected = null;

    this.itemsFA.controls.forEach((ctrl) => {
      if (this.isWarehouseItem(ctrl)) {
        ctrl.get('project_id')?.setValue(null, { emitEvent: false });
      }

      ctrl.get('project_id')?.disable({ emitEvent: false });
      ctrl.get('project_id')?.updateValueAndValidity({ emitEvent: false });
    });
  }
  // ==========================
  //  GUARDAR / ACTUALIZAR
  // ==========================

  /**
   * Crea un gasto nuevo.
   */
  saveData(): void {
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
        this.navigateToList();
      },
      error: (err) => console.error('Error al crear gasto:', err),
    });
  }

  /**
   * Actualiza un gasto existente.
   */
  updateData(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isWarehouseSafeExpense) {
      const payload = this.buildWarehouseSafePayloadFromForm();

      this.expenseService.updateWarehouseExpenseSafe(this.expenseId, payload).subscribe({
        next: (response) => {
          if (response.success) {
            this.navigateToList();
          }
        },
        error: (err) => console.error('Error al actualizar gasto con almacén:', err),
      });

      return;
    }

    const payload = this.buildPayloadFromForm();

    this.expenseService.update(this.expenseId, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.navigateToList();
        }
      },
      error: (err) => console.error('Error al actualizar gasto:', err),
    });
  }

  /**
   * Decide si crea o actualiza según exista expenseId.
   */
  private submitForm(): void {
    if (this.expenseId) {
      this.updateData();
      return;
    }

    this.saveData();
  }

  // ==========================
  //  ITEMS DEL FORMULARIO
  // ==========================

  /**
   * Crea un FormGroup para un item del gasto.
   */
  createItemGroup(data?: any): FormGroup {
    const defaultPaymentDate = data?.payment_date ?? this.getTodayIsoDate();
    const isZeroCostDiscount = this.isZeroCostXmlDiscountRaw(data ?? {});
    const amountMinValue = isZeroCostDiscount ? 0 : 0.01;

    const group = this.fb.group({
      id: [data?.id ?? null],

      item_type: this.fb.control<entity.ExpenseItemType>(
        data?.item_type ?? 'direct',
      ),

      quantity: [data?.quantity ?? null],
      unit: [data?.unit ?? null],
      unit_id: [data?.unit_id ?? null],
      unit_price: [data?.unit_price ?? null],

      xml_quantity: [data?.xml_quantity ?? data?.quantity ?? null],
      xml_unit: [data?.xml_unit ?? data?.unit ?? null],
      xml_unit_price: [data?.xml_unit_price ?? data?.unit_price ?? null],
      xml_amount: [data?.xml_amount ?? data?.amount ?? null],

      amount: [
        data?.amount ?? null,
        [Validators.required, Validators.min(amountMinValue)],
      ],

      base_amount: [data?.base_amount ?? null],
      discount_amount: [data?.discount_amount ?? null],
      tax_amount: [data?.tax_amount ?? null],
      withheld_amount: [data?.withheld_amount ?? null],

      payment_amount: [isZeroCostDiscount ? 0 : data?.payment_amount ?? null],
      payment_date: [isZeroCostDiscount ? null : defaultPaymentDate],

      project_id: this.fb.control<Catalog | null>(data?.project_id ?? null),

      product_id: this.fb.control<Catalog | null>(data?.product_id ?? null, {
        validators: Validators.required,
      }),

      product_display: this.fb.control<string>({
        value: data?.product_display ?? '',
        disabled: true,
      }),

      selected: this.fb.control<boolean>(false),
    });

    this.setupWarehouseItemBehaviour(group);

    return group;
  }

  /**
   * Agrega un item manual al gasto.
   */
  addItem(): void {
    if (this.isXmlImport || this.isLaborAuto || this.isWarehouseSafeExpense) return;

    this.itemsFA.push(this.createItemGroup());
  }

  /**
   * Elimina un item manual del gasto.
   */
  removeItem(index: number): void {
    if (this.itemsFA.length <= 1) return;
    if (this.isXmlImport || this.isLaborAuto || this.isWarehouseSafeExpense) return;

    this.itemsFA.removeAt(index);
  }

  // ==========================
  //  SELECCIÓN MASIVA
  // ==========================

  /**
   * Selecciona o deselecciona todos los items.
   */
  onToggleSelectAll(checked: boolean): void {
    this.itemsFA.controls.forEach((ctrl) => {
      ctrl.get('selected')?.setValue(checked);
    });
  }

  /**
   * Guarda el proyecto seleccionado para aplicación masiva.
   */
  onBulkProjectSelected(project: Catalog): void {
    this.bulkProjectSelected = project;
  }

  /**
   * Aplica un proyecto a los items directos seleccionados.
   */
  applyBulkProject(): void {
    const project = this.bulkProjectSelected;

    if (!project || this.isWarehouseSafeExpense || this.isPurchaseOrderProjectLocked) {
      return;
    }

    this.itemsFA.controls.forEach((ctrl) => {
      if (ctrl.get('selected')?.value && !this.isWarehouseItem(ctrl)) {
        ctrl.get('project_id')?.setValue(project);
        ctrl.get('project_id')?.markAsDirty();
        ctrl.get('project_id')?.markAsTouched();
      }
    });
  }

  /**
   * Aplica un monto a los items directos seleccionados.
   */
  applyAmountToSelected(): void {
    if (this.isXmlImport || this.isLaborAuto || this.isWarehouseSafeExpense) return;

    const amount = Number(this.bulkAmountCtrl.value ?? 0);

    if (amount <= 0) {
      this.bulkAmountCtrl.setErrors({ min: true });
      this.bulkAmountCtrl.markAsTouched();
      return;
    }

    this.itemsFA.controls.forEach((ctrl) => {
      if (!ctrl.get('selected')?.value) return;
      if (this.isWarehouseItem(ctrl)) return;

      ctrl.get('amount')?.setValue(amount);
      ctrl.get('amount')?.markAsDirty();
      ctrl.get('amount')?.markAsTouched();
      ctrl.get('amount')?.updateValueAndValidity({ emitEvent: false });

      const paymentAmount = Number(ctrl.get('payment_amount')?.value ?? 0);

      if (paymentAmount > amount) {
        ctrl.get('payment_amount')?.setValue(null);
        ctrl.get('payment_date')?.setValue(this.getTodayIsoDate());
      }
    });
  }

  /**
   * Marca como pagados los items seleccionados.
   */
  applyFullPaymentToSelected(): void {
    if (this.isLaborAuto) return;

    const paymentDate = this.bulkPaymentDateCtrl.value;

    if (!paymentDate) {
      this.bulkPaymentDateCtrl.markAsTouched();
      return;
    }

    const invalidRows: number[] = [];
    let paidRows = 0;
    let zeroCostRows = 0;

    this.itemsFA.controls.forEach((ctrl, index) => {
      if (!ctrl.get('selected')?.value) return;

      const amount = Number(ctrl.get('amount')?.value ?? 0);

      if (this.isZeroCostXmlDiscountItem(ctrl)) {
        ctrl.get('payment_amount')?.setValue(0, { emitEvent: false });
        ctrl.get('payment_date')?.setValue(null, { emitEvent: false });
        zeroCostRows++;
        return;
      }

      if (amount <= 0) {
        invalidRows.push(index + 1);
        return;
      }

      ctrl.get('payment_amount')?.setValue(amount);
      ctrl.get('payment_amount')?.markAsDirty();
      ctrl.get('payment_amount')?.markAsTouched();
      ctrl.get('payment_amount')?.updateValueAndValidity({ emitEvent: false });

      ctrl.get('payment_date')?.setValue(paymentDate);
      ctrl.get('payment_date')?.markAsDirty();
      ctrl.get('payment_date')?.markAsTouched();
      ctrl.get('payment_date')?.updateValueAndValidity({ emitEvent: false });

      paidRows++;
    });

    if (invalidRows.length > 0) {
      this.dialogService
        .confirm({
          size: 'small',
          title: 'Monto requerido',
          message:
            'Para marcar como pagado, los productos seleccionados deben tener monto mayor a $0.00.\n\n' +
            `Revisa los productos: ${invalidRows.join(', ')}.`,
          confirmText: 'OK',
          cancelText: '',
        })
        .subscribe();

      return;
    }

    if (paidRows === 0 && zeroCostRows > 0) {
      this.dialogService
        .confirm({
          size: 'small',
          title: 'Productos sin costo',
          message:
            'Los productos seleccionados tienen costo $0.00 por descuento total del CFDI, por eso no se registró abono.',
          confirmText: 'OK',
          cancelText: '',
        })
        .subscribe();
    }
  }

  // ==========================
  //  HEADER / FOOTER
  // ==========================

  /**
   * Maneja acciones del header.
   */
  onHeaderAction(action: ModuleHeaderAction | string): void {
    switch (action) {
      case 'back':
        this.handleExit();
        break;
    }
  }

  /**
   * Maneja acciones del footer reutilizable.
   */
  onFooterAction(action: ModuleFooterAction | string): void {
    switch (action) {
      case 'cancel':
        this.handleExit();
        break;

      case 'save':
        this.submitForm();
        break;
    }
  }

  /**
   * Si es XML nuevo pide confirmación, si no regresa directo.
   */
  private handleExit(): void {
    if (this.cfdiUuidFromXml && this.router.url.includes('nuevo')) {
      this.confirmExitFromXmlFlow();
      return;
    }

    this.navigateToList();
  }

  // ==========================
  //  PAYLOAD BACKEND
  // ==========================

  /**
   * Construye payload para crear o actualizar gasto normal.
   */
  buildPayloadFromForm(): entity.CreateExpense {
    const raw = this.form.getRawValue();

    return {
      date: raw.date!,
      supplier_id: toIdForm(raw.supplier_id),
      cfdi_uuid: this.cfdiUuidFromXml ?? null,

      items: (raw.items ?? []).map((item: any): entity.CreateExpenseItem => {
        const itemType: entity.ExpenseItemType = item.item_type ?? 'direct';
        const isWarehouse = itemType === 'warehouse';
        const isXml = !!this.cfdiUuidFromXml;

        const xmlQuantity = isXml
          ? this.toNumberOrNull(item.quantity) ??
          this.toNumberOrNull(item.xml_quantity)
          : null;

        const quantity = isWarehouse
          ? this.toNumberOrNull(item.quantity)
          : xmlQuantity;

        const unitId = isWarehouse
          ? toIdForm(item.unit_id) ?? this.toNumberOrNull(item.unit_id)
          : null;

        const xmlUnit = String(item.unit ?? item.xml_unit ?? '').trim();
        const unit = isWarehouse ? null : isXml && xmlUnit ? xmlUnit : null;

        const fiscalAmount = isXml
          ? this.resolveXmlAmountFromRawItem(item)
          : null;

        const formAmount = this.toNumberOrNull(item.amount);

        const amount = fiscalAmount !== null
          ? fiscalAmount
          : isWarehouse && quantity && this.toNumberOrNull(item.unit_price)
            ? this.round2(quantity * Number(item.unit_price))
            : this.round2(formAmount ?? 0);

        const unitPrice = isWarehouse
          ? fiscalAmount !== null
            ? this.resolveXmlUnitPriceFromAmount(fiscalAmount, quantity)
            : this.toNumberOrNull(item.unit_price)
          : isXml
            ? fiscalAmount !== null
              ? this.resolveXmlUnitPriceFromAmount(fiscalAmount, quantity)
              : this.toNumberOrNull(item.unit_price) ??
              this.toNumberOrNull(item.xml_unit_price)
            : null;

        const paymentAmount = this.resolvePayloadPaymentAmount(
          item.payment_amount,
          amount,
          formAmount,
          item,
        );

        return {
          id:
            item.id !== null &&
              item.id !== undefined &&
              item.id !== ''
              ? Number(item.id)
              : null,

          item_type: itemType,

          quantity:
            (isWarehouse || isXml) && quantity !== null
              ? this.round4(quantity)
              : null,

          unit_id:
            isWarehouse && unitId !== null
              ? unitId
              : null,

          unit,

          unit_price:
            (isWarehouse || isXml) && unitPrice !== null
              ? this.round6(unitPrice)
              : null,

          amount,

          base_amount:
            item.base_amount !== null &&
              item.base_amount !== undefined &&
              item.base_amount !== ''
              ? this.round2(Number(item.base_amount))
              : null,

          discount_amount:
            item.discount_amount !== null &&
              item.discount_amount !== undefined &&
              item.discount_amount !== ''
              ? this.round2(Number(item.discount_amount))
              : null,

          tax_amount:
            item.tax_amount !== null &&
              item.tax_amount !== undefined &&
              item.tax_amount !== ''
              ? this.round2(Number(item.tax_amount))
              : null,

          withheld_amount:
            item.withheld_amount !== null &&
              item.withheld_amount !== undefined &&
              item.withheld_amount !== ''
              ? this.round2(Number(item.withheld_amount))
              : null,

          payment_amount: paymentAmount,

          payment_date:
            paymentAmount !== null && paymentAmount > 0
              ? item.payment_date ?? null
              : null,

          project_id:
            isWarehouse
              ? null
              : toIdForm(item.project_id),

          product_id: toIdForm(item.product_id),
        };
      }),
    };
  }

  /**
   * Construye payload seguro para editar solo pagos de almacén.
   */
  buildWarehouseSafePayloadFromForm(): entity.UpdateWarehouseExpenseSafe {
    const raw = this.form.getRawValue();

    return {
      date: raw.date ?? undefined,
      supplier_id: toIdForm(raw.supplier_id),

      items: (raw.items ?? [])
        .filter((item: any) => !!item.id)
        .map((item: any): entity.UpdateWarehouseExpenseSafeItem => {
          const paymentAmount =
            item.payment_amount !== null &&
              item.payment_amount !== undefined &&
              item.payment_amount !== ''
              ? Number(item.payment_amount)
              : null;

          return {
            id: Number(item.id),
            payment_amount: paymentAmount,
            payment_date:
              paymentAmount !== null && paymentAmount > 0
                ? item.payment_date ?? null
                : null,
          };
        }),
    };
  }

  // ==========================
  //  COLA XML
  // ==========================

  /**
   * Carga el siguiente XML de la cola o sale si ya no hay.
   */
  loadNextXmlFromQueueOrExit(): void {
    const nextDraft = this.expenseService.consumeNextXmlDraft();

    if (!nextDraft) {
      this.expenseService.clearXmlQueue();
      this.isXmlImport = false;
      this.isLaborAuto = false;
      this.hasWarehouseItems = false;
      this.cfdiUuidFromXml = null;
      this.navigateToList();
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

    this.bulkAmountCtrl.setValue(null, { emitEvent: false });
    this.bulkPaymentDateCtrl.setValue('', { emitEvent: false });
  }

  /**
   * Confirma salida cuando el usuario está en flujo XML.
   */
  confirmExitFromXmlFlow(): void {
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

  // ==========================
  //  TOOLTIPS
  // ==========================

  /**
   * Construye tooltip para descuentos XML.
   */
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

  /**
   * Construye tooltip para retenciones XML.
   */
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

  // ==========================
  //  NAVEGACIÓN
  // ==========================

  /**
   * Regresa a la pantalla origen.
   */
  navigateToList(): void {
    this.navigateBack();
  }

  /**
   * Obtiene returnUrl desde queryParams.
   */
  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
      return '/gastos';
    }

    return returnUrl;
  }

  /**
   * Ejecuta navegación de regreso.
   */
  private navigateBack(): void {
    this.router.navigateByUrl(this.getReturnUrl());
  }
}

