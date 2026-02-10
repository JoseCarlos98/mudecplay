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
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

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
    MatTooltip
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

  // Config del header
  readonly headerConfig = HEADER_CONFIG;

  // bandera para saber si viene de XML (o si el gasto está ligado a un CFDI)
  isXmlImport: boolean = false;

  // uuid del CFDI cuando viene de XML
  cfdiUuidFromXml: string | null = null;

  // contador visual de la cola de XML
  xmlQueueTotal: number = 0; // total de CFDI en la cola
  xmlQueuePending: number = 0; // pendientes después del actual

  // Formulario reactivo principal
  form: FormGroup = this.fb.group({
    date: this.fb.control<string | null>(null, {
      validators: Validators.required,
    }),
    supplier_id: this.fb.control<Catalog | null>(null),
    items: this.fb.array([this.createItemGroup()]),
  });

  // Control para el proyecto masivo (su value será id/number por tu CVA)
  bulkProjectCtrl = this.fb.control<any>(null);

  // guardamos el objeto seleccionado para aplicar y para que se vea el nombre
  bulkProjectSelected: Catalog | null = null;

  // Si es 0 => creación; si tiene valor => edición
  expenseId: number = 0;

  // Detalle completo del gasto cuando es edición
  formData!: entity.ExpenseDetail;

  // índice actual calculado (para mostrar "CFDI 1 de N")
  get currentXmlIndex(): number {
    if (!this.xmlQueueTotal) return 1;
    return this.xmlQueueTotal - this.xmlQueuePending;
  }

  ngOnInit() {
    const idParam = this.activatedroute.snapshot.paramMap.get('id');

    if (idParam) {
      // Modo edición
      this.expenseId = +idParam;
      this.loadExpense(this.expenseId);
    } else {
      // Modo creación y revisar si hay cola de XML
      if (this.expenseService.hasMoreXmlDrafts()) {
        this.loadNextXmlFromQueueOrExit(); // carga el primer CFDI de la cola
      }
    }

    // si limpian el autocomplete masivo (X), limpiamos también el objeto guardado
    this.bulkProjectCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (v == null || v === '') {
          this.bulkProjectSelected = null;
        }
      });
  }

  // ==========================
  //  HELPER FECHA HOY
  // ==========================
  /** Devuelve fecha actual en formato 'YYYY-MM-DD' */
  private getTodayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // ==========================
  //  CARGAR GASTO (EDICIÓN)
  // ==========================
  loadExpense(id: number) {
    this.expenseService.getById(id).subscribe({
      next: (response: entity.ExpenseDetail) => {
        this.formData = response;

        // Si el backend manda cfdi_uuid, lo usamos como bandera
        const anyResp: any = response as any;
        this.isXmlImport = !!anyResp.cfdi_uuid;
        this.cfdiUuidFromXml = anyResp.cfdi_uuid ?? null;

        this.form.patchValue({
          date: response.date,
          supplier_id: response.supplier
            ? toCatalogAutoComplete(
              response.supplier.id,
              response.supplier.company_name,
            )
            : null,
        });

        const itemsFGs = response.items.map((item) =>
          this.createItemGroup({
            amount: item.amount,
            payment_amount: item.payment_amount ?? null,
            payment_date: item.payment_date ?? null,

            base_amount: (item as any).base_amount ?? null,
            discount_amount: (item as any).discount_amount ?? null,
            tax_amount: (item as any).tax_amount ?? null,

            project_id: item.project
              ? toCatalogAutoComplete(item.project.id, item.project.name)
              : null,
            product_id: item.product
              ? toCatalogAutoComplete(item.product.id, item.product.name)
              : null,
          } as any),
        );

        this.form.setControl('items', this.fb.array(itemsFGs));

        // si viene de XML, bloqueamos los campos "duros"
        this.applyXmlLocking();
      },
      error: (err) => console.error('Error al cargar gastos:', err),
    });
  }

  // ==========================
  //  CARGAR DESDE XML (CREACIÓN)
  // ==========================
  patchFormFromXmlDraft(draft: entity.XmlExpenseDraftDto) {
    this.isXmlImport = true;
    this.cfdiUuidFromXml = draft.uuid;

    this.form.patchValue({
      date: draft.date,
      supplier_id: draft.supplier
        ? toCatalogAutoComplete(draft.supplier.id, draft.supplier.name)
        : null,
    });

    const itemsFGs = draft.items.map((item) =>
      this.createItemGroup({
        amount: item.amount,
        payment_amount: item.payment_amount ?? null,
        payment_date: item.payment_date ?? null,

        base_amount: (item as any).base_amount ?? null,
        discount_amount: (item as any).discount_amount ?? null,
        tax_amount: (item as any).tax_amount ?? null,

        project_id: null,
        product_id: item.product
          ? toCatalogAutoComplete(item.product.id, item.product.name)
          : null,
      } as any),
    );

    this.form.setControl('items', this.fb.array(itemsFGs));

    // bloquear campos que vienen del CFDI
    this.applyXmlLocking();
  }

  /**
   * Bloquea los campos que vienen "duros" del CFDI:
   * - Fecha
   * - Proveedor
   * - Producto y Monto de cada item
   * El usuario solo puede editar proyecto y abonos.
   */
  applyXmlLocking(): void {
    if (!this.isXmlImport) return;

    this.form.get('date')?.disable();
    this.form.get('supplier_id')?.disable();

    this.itemsFA.controls.forEach((ctrl) => {
      ctrl.get('product_id')?.disable();
      ctrl.get('amount')?.disable();

      // Estos también vienen del CFDI (solo lectura)
      ctrl.get('base_amount')?.disable();
      ctrl.get('discount_amount')?.disable();
      ctrl.get('tax_amount')?.disable();
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

        // Si viene de XML y hay más CFDI en cola → cargar siguiente en el MISMO form
        if (this.isXmlImport && this.expenseService.hasMoreXmlDrafts()) {
          this.loadNextXmlFromQueueOrExit();
          return;
        }

        // Fin de cola o gasto manual → volver al listado
        this.expenseService.clearXmlQueue(); // por si era el último
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
  //  GETTERS FORM ARRAY
  // ==========================
  get itemsFA(): FormArray {
    return this.form.get('items') as FormArray;
  }

  /** Algún item seleccionado (para habilitar botón aplicar) */
  get hasAnySelected(): boolean {
    return this.itemsFA.controls.some((ctrl) => !!ctrl.get('selected')?.value);
  }

  /** Todos seleccionados (para estado del checkbox "Seleccionar todos") */
  get allSelected(): boolean {
    if (!this.itemsFA.length) return false;
    return this.itemsFA.controls.every((ctrl) => !!ctrl.get('selected')?.value);
  }

  // ==========================
  //  ITEMS FORM
  // ==========================
  createItemGroup(data?: any): FormGroup {
    const defaultPaymentDate = data?.payment_date ?? this.getTodayIsoDate();

    return this.fb.group({
      amount: [data?.amount ?? null, [Validators.required, Validators.min(0.01)]],

      // NUEVOS CAMPOS CFDI (se guardan; en XML se muestran bloqueados)
      base_amount: [data?.base_amount ?? null],
      discount_amount: [data?.discount_amount ?? null],
      tax_amount: [data?.tax_amount ?? null],

      payment_amount: [data?.payment_amount ?? null],
      payment_date: [defaultPaymentDate],
      project_id: this.fb.control<Catalog | null>(data?.project_id ?? null),
      product_id: this.fb.control<Catalog | null>(data?.product_id ?? null, {
        validators: Validators.required,
      }),
      // campo solo de UI para selección masiva
      selected: this.fb.control<boolean>(false),
    });
  }

  addItem() {
    // Si el gasto viene de XML, no permitimos agregar más ítems
    if (this.isXmlImport) return;
    this.itemsFA.push(this.createItemGroup());
  }

  removeItem(index: number) {
    if (this.itemsFA.length <= 1) return;
    if (this.isXmlImport) return;
    this.itemsFA.removeAt(index);
  }

  // ==========================
  //  SELECCIÓN MASIVA
  // ==========================
  /** Marca / desmarca todos los ítems */
  onToggleSelectAll(checked: boolean): void {
    this.itemsFA.controls.forEach((ctrl) => {
      ctrl.get('selected')?.setValue(checked);
    });
  }

  // se llama cuando el autocomplete masivo selecciona una opción
  onBulkProjectSelected(p: Catalog) {
    this.bulkProjectSelected = p;
  }

  /** Aplica el proyecto elegido a todos los ítems seleccionados */
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

        // IMPORTANTES: mandar para persistir lo del CFDI
        base_amount:
          item.base_amount !== null && item.base_amount !== undefined && item.base_amount !== ''
            ? Number(item.base_amount)
            : null,
        discount_amount:
          item.discount_amount !== null &&
            item.discount_amount !== undefined &&
            item.discount_amount !== ''
            ? Number(item.discount_amount)
            : null,
        tax_amount:
          item.tax_amount !== null && item.tax_amount !== undefined && item.tax_amount !== ''
            ? Number(item.tax_amount)
            : null,

        payment_amount:
          item.payment_amount !== null && item.payment_amount !== ''
            ? Number(item.payment_amount)
            : null,

        // Solo mandamos fecha cuando amount == payment_amount;
        payment_date: item.amount == item.payment_amount ? item.payment_date : null,

        project_id: toIdForm(item.project_id),
        product_id: toIdForm(item.product_id),
      })),
    };
  }

  /** Carga el siguiente draft de la cola en el formulario */
  loadNextXmlFromQueueOrExit() {
    const nextDraft = this.expenseService.consumeNextXmlDraft();

    // Si ya no hay más drafts, terminamos flujo XML
    if (!nextDraft) {
      this.expenseService.clearXmlQueue();
      this.isXmlImport = false;
      this.cfdiUuidFromXml = null;
      this.router.navigateByUrl('/gastos');
      return;
    }

    // Reset duro del form antes de parchear el nuevo CFDI
    this.form.reset();
    this.form.setControl('items', this.fb.array([this.createItemGroup()]));

    // Rellenamos con el nuevo draft
    this.patchFormFromXmlDraft(nextDraft);

    // Recalculamos contadores de la cola
    const status = this.expenseService.getXmlQueueStatus();
    this.xmlQueueTotal = status.total;
    this.xmlQueuePending = status.pending;

    // limpiamos selección masiva para evitar que se quede pegada
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

        // limpiamos cola y volvemos al listado
        this.expenseService.clearXmlQueue();
        this.navigateToList();
      });
  }

  buildDiscountTooltip(itemCtrl: any): string {
    const base = Number(itemCtrl.get('base_amount')?.value ?? 0);
    const discount = Number(itemCtrl.get('discount_amount')?.value ?? 0);
    const tax = Number(itemCtrl.get('tax_amount')?.value ?? 0);
    const total = Number(itemCtrl.get('amount')?.value ?? 0);

    // Formato simple con $ y 2 decimales (para tooltip nativo)
    const money = (n: number) =>
      `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return [
      `Base: ${money(base)}`,
      `Descuento: -${money(discount)}`,
      `IVA: ${money(tax)}`,
      `Total: ${money(total)}`,
    ].join('\n');
  }

  navigateToList() {
    this.router.navigateByUrl('/gastos');
  }
}
