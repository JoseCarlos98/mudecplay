import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { toCatalogAutoComplete, toIdForm } from '../../../../shared/helpers/general-helpers';
import { ExpenseService } from '../../services/expense.service';
import * as entity from '../../interfaces/expense-interfaces';
import { Autocomplete } from '../../../../shared/ui/autocomplete/autocomplete';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../../shared/ui/input-date/input-date';
import { BtnsSection, ModuleFooterAction } from '../../../../shared/ui/btns-section/btns-section';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ModuleHeaderAction, ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true
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
    MatButtonModule
  ],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss',
})
export class ExpenseForm implements OnInit {
  // Inyección con inject() para mantener la clase más limpia
  private readonly route = inject(ActivatedRoute);
  private readonly expenseService = inject(ExpenseService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Config del header (muestra flecha back, etc.)
  readonly headerConfig = HEADER_CONFIG;

  // Formulario reactivo principal
  form: FormGroup = this.fb.group({
    date: this.fb.control<string | null>(null, { validators: Validators.required }),
    supplier_id: this.fb.control<Catalog | null>(null),
    items: this.fb.array([this.createItemGroup()])
  });

  // Si es 0 => es creación, si tiene valor => edición
  expenseId: number = 0;

  // Detalle completo del gasto traído desde el backend (para inicialDisplay, etc.)
  formData!: entity.ExpenseDetail;

  ngOnInit() {
    // Leemos el id de la ruta solo una vez (snapshot)
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.expenseId = +idParam;
      this.loadExpense(this.expenseId);
    }
  }

  // GET /expenses/:id -> carga el gasto para edición
  loadExpense(id: number) {
    this.expenseService.getById(id).subscribe({
      next: (response: entity.ExpenseDetail) => {
        this.formData = response;

        this.form.patchValue({
          date: response.date,
          supplier_id: response.supplier
            ? toCatalogAutoComplete(response.supplier.id, response.supplier.company_name)
            : null,
        });

        // Creamos un FormGroup por cada item que viene del backend
        const itemsFGs = response.items.map((item) =>
          this.createItemGroup({
            concept: item.concept,
            amount: item.amount,
            project_id: item.project
              ? toCatalogAutoComplete(item.project.id, item.project.name)
              : null,
          }),
        );

        // Reemplazamos por completo el FormArray de items
        this.form.setControl('items', this.fb.array(itemsFGs));
      },
      error: (err) => console.error('Error al cargar gastos:', err),
    });
  }

  // Crear un nuevo gasto
  saveData() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayloadFromForm();

    this.expenseService.create(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigateByUrl('/gastos');
        }
      },
      error: (err) => console.error('Error al crear gasto:', err),
    });
  }

  // Actualizar gasto existente
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

  // Getter para no castear this.form.get('items') cada vez
  get itemsFA(): FormArray {
    return this.form.get('items') as FormArray;
  }

  // Crea un FormGroup para un item de gasto
  createItemGroup(data?: entity.ExpenseItemForm): FormGroup {
    return this.fb.group({
      concept: [data?.concept ?? '', Validators.required],
      amount: [data?.amount ?? null, [Validators.required, Validators.min(0.01)]],
      // project_id: [data?.project_id ?? null],
      project_id: this.fb.control<Catalog | null>(data?.project_id ?? null),

    });
  }

  // Agrega una nueva fila de item
  addItem() {
    this.itemsFA.push(this.createItemGroup());
  }

  // Elimina una fila de item (si hay más de una)
  removeItem(index: number) {
    if (this.itemsFA.length <= 1) return; // regla de negocio: al menos 1 item
    this.itemsFA.removeAt(index);
  }

  // Acción del header (por ahora solo 'back')
  onHeaderAction(action: ModuleHeaderAction | string) {
    switch (action) {
      case 'back':
        this.router.navigateByUrl('/gastos');
        break;
    }
  }

  // Acciones del footer (cancel / save)
  onFooterAction(action: ModuleFooterAction | string) {
    switch (action) {
      case 'cancel':
        this.router.navigateByUrl('/gastos');
        break;
      // 'save' lo maneja el propio submit del formulario
    }
  }

  // HELPERS LOCALES: arma el payload que espera el backend
  private buildPayloadFromForm(): entity.CreateExpense {
    const raw = this.form.getRawValue();

    return {
      date: raw.date, // si quieres, aquí puedes pasar por toApiDate(raw.date)
      supplier_id: toIdForm(raw.supplier_id),
      items: (raw.items ?? []).map((item: any) => ({
        concept: (item.concept ?? '').trim(),
        amount: Number(item.amount),
        project_id: toIdForm(item.project_id),
      })),
    };
  }
}
