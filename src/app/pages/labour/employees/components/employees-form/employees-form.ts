import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { InputField } from '../../../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../../../shared/ui/input-date/input-date';
import { InputSelect } from '../../../../../shared/ui/input-select/input-select';
import {
  ModuleHeaderAction,
  ModuleHeaderConfig,
} from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import {
  BtnsSection,
  ModuleFooterAction,
} from '../../../../../shared/ui/btns-section/btns-section';

interface CatalogOption {
  id: string;
  name: string;
}

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

const AREA_OPTIONS: CatalogOption[] = [
  { id: 'CARPINTEROS', name: 'Carpinteros' },
  { id: 'BARNIZADORES', name: 'Barnizadores' },
  { id: 'PINTORES', name: 'Pintores' },
  { id: 'JARDINEROS', name: 'Jardineros' },
  { id: 'CHOFERES', name: 'Choferes' },
  { id: 'ARQUITECTOS', name: 'Arquitectos' },
  { id: 'INGENIEROS', name: 'Ingenieros' },
  { id: 'ADMINISTRATIVOS', name: 'Administrativos' },
  { id: 'ELECTRICOS', name: 'Eléctricos' },
  { id: 'PLOMEROS', name: 'Plomeros' },
  { id: 'TECNICOS', name: 'Técnicos' },
];

@Component({
  selector: 'app-employees-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModuleHeader,
    BtnsSection,
    InputField,
    InputDate,
    InputSelect,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './employees-form.html',
  styleUrl: './employees-form.scss',
})
export class EmployeesForm {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;

  readonly headerConfig = HEADER_CONFIG;
  readonly areaOptions = AREA_OPTIONS;

  isEditMode = false;
  calculatedAge: number | null = null;
  photoPreview: string | null = null;
  photoFile: File | null = null;

  form = this.fb.group({
    full_name: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    address: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(250)],
    }),
    birth_date: this.fb.control<string | null>(null, {
      validators: [Validators.required],
    }),
    age: this.fb.control<string>('', {
      nonNullable: true,
    }),
    curp: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(18), Validators.maxLength(18)],
    }),
    area: this.fb.control<string | null>(null, {
      validators: [Validators.required],
    }),
    position: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    entry_date: this.fb.control<string | null>(null, {
      validators: [Validators.required],
    }),
    discharge_date: this.fb.control<string | null>(null),
    reentry_date: this.fb.control<string | null>(null),
    weekly_salary: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  constructor() {
    this.form
      .get('birth_date')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.calculatedAge = this.calculateAge(value);
        this.form.get('age')?.setValue(
          this.calculatedAge !== null ? `${this.calculatedAge} años` : '',
          { emitEvent: false },
        );
      });

    this.form
      .get('curp')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const nextValue = (value ?? '').toUpperCase();
        if (value !== nextValue) {
          this.form.get('curp')?.setValue(nextValue, { emitEvent: false });
        }
      });
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Editar empleado' : 'Nuevo empleado';
  }

  get dailySalaryPreview(): number {
    const weeklySalary = Number(this.form.get('weekly_salary')?.value ?? 0);
    if (!weeklySalary || weeklySalary < 0) return 0;
    return weeklySalary / 7;
  }

  onHeaderAction(action: ModuleHeaderAction | string): void {
    switch (action) {
      case 'back':
        this.navigateToList();
        break;
    }
  }

  onFooterAction(action: ModuleFooterAction | string): void {
    switch (action) {
      case 'cancel':
        this.navigateToList();
        break;

      case 'save':
        this.saveData();
        break;
    }
  }

  triggerPhotoInput(): void {
    this.photoInput?.nativeElement.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      input.value = '';
      return;
    }

    this.photoFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.photoFile = null;
    this.photoPreview = null;

    if (this.photoInput?.nativeElement) {
      this.photoInput.nativeElement.value = '';
    }
  }

  saveData(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload = {
      ...raw,
      age_number: this.calculatedAge,
      photo_file_name: this.photoFile?.name ?? null,
      daily_salary_preview: this.dailySalaryPreview,
    };

    console.log('Empleado dummy listo para guardar:', payload);
  }

  private navigateToList(): void {
    this.router.navigateByUrl('/mano-de-obra/empleados');
  }

  private calculateAge(value: string | null | undefined): number | null {
    if (!value) return null;

    const birthDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age >= 0 ? age : null;
  }
}