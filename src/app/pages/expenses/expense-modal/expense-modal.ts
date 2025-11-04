import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModuleHeader, ModuleHeaderConfig } from '../../../shared/module-header/module-header';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { ExpenseSupplier } from '../interfaces/expense-interfaces';
import { Catalog } from '../../../shared/general-interfaces/general-interfaces';
import { debounceTime, distinctUntilChanged, map, Observable, of, startWith, switchMap } from 'rxjs';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true
};

@Component({
  selector: 'app-expense-modal',
  imports: [CommonModule, ModuleHeader, MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule,

    MatAutocompleteModule, MatOptionModule
  ],
  templateUrl: './expense-modal.html',
  styleUrl: './expense-modal.scss',
})
export class ExpenseModal implements AfterViewInit, OnInit {
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExpenseModal>);
  private readonly fb = inject(FormBuilder)
  readonly headerConfig = HEADER_CONFIG;

  useRemoteSuppliers = false;
  useRemoteProjects = false;

  suppliers: Catalog[] = [];
  projects: Catalog[] = [];

  filteredSuppliers$: Observable<Catalog[]> = of([]);
  filteredProjects$: Observable<Catalog[]> = of([]);

  form: FormGroup = this.fb.group({
    concept: ['', Validators.required],
    date: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    supplier_id: [''],
    project_id: [''],
  })

  ngOnInit(): void {
    if (this.data?.expense) {
      this.form.patchValue({
        concept: this.data.expense.concept,
        date: this.data.expense.date,
        amount: this.data.expense.amount,
        supplier_id: this.data.expense.supplier?.id ?? '',
        project_id: this.data.expense.project?.id ?? '',
      });
    }

    this.initSuppliersAutocomplete();
  }

  ngAfterViewInit(): void {
    console.log('Data', this.data);
    this.initSuppliersAutocomplete();
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    console.log('Payload listo para enviar a backend:', payload);
  }

  initSuppliersAutocomplete() {
    const control = this.form.get('supplier_id')!;

    if (this.useRemoteSuppliers) {
      this.filteredSuppliers$ = control.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => this.fetchSuppliersFromBackend(term))
      );
    } else {
      // datos mock locales
      this.suppliers = [
        { id: '1', name: 'Maderia Madero' },
        { id: '2', name: 'Proveedora del Norte' },
        { id: '3', name: 'Acabados del Pacífico' },
      ];

      this.filteredSuppliers$ = control.valueChanges.pipe(
        // si el control ya trae '1' por edición, lo usamos
        startWith(control.value ?? ''),
        map(value => this.filterLocal(this.suppliers, value))
      );
    }
  }

fetchSuppliersFromBackend(searchTerm: string): Observable<Catalog[]> {
  // aquí va tu service real
  // return this.supplierService.search(searchTerm).pipe(
  //   tap(list => {
  //     // cachearlos para displayWith
  //     list.forEach(item => this.suppliersMap.set(item.id, item.name));
  //   })
  // );
  return of([]); // placeholder por ahora
}


  filterLocal(list: Catalog[], value: any): Catalog[] {
    const term = (typeof value === 'string' ? value : '').toLowerCase();
    return list.filter(item => item.name.toLowerCase().includes(term));
  }

  displayCatalog = (value: string | Catalog): string => {
    if (!value) return '';

    // caso 1: ya viene el objeto { id, name }
    if (typeof value !== 'string') {
      return value.name;
    }

    // caso 2: viene el id como string → lo buscamos en proveedores
    const supplier = this.suppliers.find(s => s.id === value);
    if (supplier) return supplier.name;

    // caso 3: viene el id como string → lo buscamos en proyectos
    const project = this.projects.find(p => p.id === value);
    if (project) return project.name;

    // fallback
    return value;
  };


  closeModal() {
    this.dialogRef.close();
  }
}
