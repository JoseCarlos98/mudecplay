import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
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
import { ActivatedRoute, Router } from '@angular/router';

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
    BtnsSection,
    MatButtonModule,
  ],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss',
})
export class ExpenseForm implements OnInit {
  // ==========================
  //  INYECCIONES
  // ==========================
  private readonly route = inject(ActivatedRoute);
  private readonly expenseService = inject(ExpenseService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Config del header
  readonly headerConfig = HEADER_CONFIG;

  // bandera para saber si viene de XML
  isXmlImport:boolean = false;

  // uuid del CFDI cuando viene de XML
  cfdiUuidFromXml: string | null = null;

  // Formulario reactivo principal
  form: FormGroup = this.fb.group({
    date: this.fb.control<string | null>(null, {
      validators: Validators.required,
    }),
    supplier_id: this.fb.control<Catalog | null>(null),
    items: this.fb.array([this.createItemGroup()]),
  });

  // Si es 0 => creación; si tiene valor => edición
  expenseId: number = 0;

  // Detalle completo del gasto cuando es edición
  formData!: entity.ExpenseDetail;

  // ngOnInit() {
  //   const idParam = this.route.snapshot.paramMap.get('id');

  //   if (idParam) {
  //     // Modo edición
  //     this.expenseId = +idParam;
  //     this.loadExpense(this.expenseId);
  //     return;
  //   }

  //   // Modo creación: revisar si venimos de un XML
  //   const draft = this.expenseService.consumeXmlDraftToImport();
  //   if (draft) {
  //     this.patchFormFromXmlDraft(draft);
  //   }
  // }

  // ==========================
  //  CARGAR GASTO (EDICIÓN)
  // ==========================
  
  ngOnInit() {
  const idParam = this.route.snapshot.paramMap.get('id');

  if (idParam) {
    // 🔹 Modo edición
    this.expenseId = +idParam;
    this.loadExpense(this.expenseId);
  } else {
    // 🔹 Modo creación
    const draft = this.expenseService.consumeNextXmlDraft();

    if (draft) {
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
          product_id: item.product
            ? toCatalogAutoComplete(item.product.id, item.product.name)
            : null,
          amount: item.amount,
          payment_amount: item.payment_amount ?? null,
          payment_date: item.payment_date ?? null,
          project_id: null,
        }),
      );

      this.form.setControl('items', this.fb.array(itemsFGs));
    }
  }
}

  
  
  loadExpense(id: number) {
    this.expenseService.getById(id).subscribe({
      next: (response: entity.ExpenseDetail) => {
        this.formData = response;

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
            project_id: item.project
              ? toCatalogAutoComplete(item.project.id, item.project.name)
              : null,
            product_id: item.product
              ? toCatalogAutoComplete(item.product.id, item.product.name)
              : null,
          }),
        );

        this.form.setControl('items', this.fb.array(itemsFGs));
      },
      error: (err) => console.error('Error al cargar gastos:', err),
    });
  }

  // ==========================
  //  CARGAR DESDE XML (CREACIÓN)
  // ==========================
  private patchFormFromXmlDraft(draft: entity.XmlExpenseDraftDto) {
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
        project_id: null,
        product_id: item.product
          ? toCatalogAutoComplete(item.product.id, item.product.name)
          : null,
      }),
    );

    this.form.setControl('items', this.fb.array(itemsFGs));
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
    console.log('PAYLOAD CREATE 👉', payload);

    this.expenseService.create(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigateByUrl('/gastos');
        }
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
  //  GETTER FORM ARRAY
  // ==========================
  get itemsFA(): FormArray {
    return this.form.get('items') as FormArray;
  }

  // ==========================
  //  ITEMS FORM
  // ==========================
  createItemGroup(data?: entity.ExpenseItemForm): FormGroup {
    return this.fb.group({
      amount: [
        data?.amount ?? null,
        [Validators.required, Validators.min(0.01)],
      ],
      payment_amount: [data?.payment_amount ?? null, [Validators.min(0)]],
      payment_date: [data?.payment_date ?? null],
      project_id: this.fb.control<Catalog | null>(data?.project_id ?? null),
      product_id: this.fb.control<Catalog | null>(data?.product_id ?? null, {
        validators: Validators.required,
      }),
    });
  }

  addItem() {
    this.itemsFA.push(this.createItemGroup());
  }

  removeItem(index: number) {
    if (this.itemsFA.length <= 1) return;
    this.itemsFA.removeAt(index);
  }

  // ==========================
  //  HEADER
  // ==========================
  onHeaderAction(action: ModuleHeaderAction | string) {
    switch (action) {
      case 'back':
        this.router.navigateByUrl('/gastos');
        break;
    }
  }

  // ==========================
  //  FOOTER
  // ==========================
  onFooterAction(action: ModuleFooterAction | string) {
    switch (action) {
      case 'cancel':
        this.router.navigateByUrl('/gastos');
        break;
    }
  }

  // ==========================
  //  PAYLOAD BACKEND
  // ==========================
  private buildPayloadFromForm(): entity.CreateExpense {
    const raw = this.form.getRawValue();

    return {
      date: raw.date!,
      supplier_id: toIdForm(raw.supplier_id),
      cfdi_uuid: this.cfdiUuidFromXml,

      items: (raw.items ?? []).map((item: any): entity.CreateExpenseItem => ({
        amount: Number(item.amount),

        payment_amount:
          item.payment_amount !== null && item.payment_amount !== ''
            ? Number(item.payment_amount)
            : null,

        payment_date: item.payment_date || null,

        project_id: toIdForm(item.project_id),
        product_id: toIdForm(item.product_id)
      })),
    };
  }
}
