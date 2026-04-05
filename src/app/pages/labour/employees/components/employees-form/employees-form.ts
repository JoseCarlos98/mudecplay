import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, of, switchMap } from 'rxjs';

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
import { Catalog } from '../../../../../shared/interfaces/general-interfaces';
import { StorageApiService } from '../../../../../shared/services/storage-api.service';
import { EmployeesService } from '../../services/employees.service';
import * as entity from '../../interfaces/employees-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  formFull: true,
};

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
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storageApi = inject(StorageApiService);
  private readonly employeesService = inject(EmployeesService);

  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;

  readonly headerConfig = HEADER_CONFIG;

  areaOptions: Catalog[] = [];

  isEditMode = false;
  isSaving = false;
  employeeId = 0;

  calculatedAge: number | null = null;
  photoPreview: string | null = null;
  photoFile: File | null = null;
  photoRemoved = false;

  form = this.fb.group({
    full_name: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    address: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    birth_date: this.fb.control<string | null>(null, {
      validators: [Validators.required],
    }),
    age: this.fb.control(
      { value: '', disabled: true },
      {
        nonNullable: true,
      },
    ),
    curp: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(18), Validators.maxLength(18)],
    }),
    employee_area_id: this.fb.control<number | null>(null, {
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

    this.loadEmployeeAreasCatalog();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.employeeId = Number(idParam);
      this.isEditMode = true;
      this.loadEmployeeById(this.employeeId);
    }
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

    this.revokePreviewIfBlob();
    this.photoFile = file;
    this.photoRemoved = false;

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.revokePreviewIfBlob();

    this.photoFile = null;
    this.photoPreview = null;
    this.photoRemoved = this.isEditMode;

    if (this.photoInput?.nativeElement) {
      this.photoInput.nativeElement.value = '';
    }
  }

  saveData(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    this.isSaving = true;

    const request$ = this.isEditMode
      ? this.employeesService.update(this.employeeId, payload)
      : this.employeesService.create(payload);

    request$
      .pipe(
        switchMap((resp) => {
          const id = this.isEditMode ? this.employeeId : resp.id;
          return this.uploadPhotoIfNeeded(id);
        }),
        finalize(() => {
          this.isSaving = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.navigateToList();
        },
        error: (err) => {
          console.error('Error guardando empleado:', err);
        },
      });
  }

  private buildPayload(): entity.CreateEmployee {
    const raw = this.form.getRawValue();

    const payload: entity.CreateEmployee = {
      full_name: String(raw.full_name ?? '').trim(),
      address: String(raw.address ?? '').trim(),
      birth_date: raw.birth_date!,
      curp: String(raw.curp ?? '').trim().toUpperCase(),
      employee_area_id: Number(raw.employee_area_id),
      position: String(raw.position ?? '').trim(),
      entry_date: raw.entry_date!,
      discharge_date: raw.discharge_date ?? null,
      reentry_date: raw.reentry_date ?? null,
      weekly_salary: Number(raw.weekly_salary ?? 0),
    };

    if (this.isEditMode && this.photoRemoved && !this.photoFile) {
      payload.photo_key = null;
    }

    return payload;
  }

  private uploadPhotoIfNeeded(employeeId: number) {
    if (!this.photoFile) {
      return of(null);
    }

    const file = this.photoFile;

    return this.storageApi.getEmployeePhotoUploadUrl(employeeId, file).pipe(
      switchMap((presign) =>
        this.storageApi.uploadToS3(presign.uploadUrl, file).pipe(
          switchMap(() =>
            this.employeesService.update(employeeId, {
              photo_key: presign.key,
            }),
          ),
        ),
      ),
    );
  }

  private loadEmployeeAreasCatalog(): void {
    this.employeesService
      .getEmployeeAreasCatalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.areaOptions = response ?? [];
        },
        error: (err) => {
          console.error('Error cargando catálogo de áreas de empleados:', err);
        },
      });
  }

  private loadEmployeeById(id: number): void {
    this.employeesService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.calculatedAge = response.age ?? null;
          this.photoPreview = response.photoUrl ?? null;
          this.photoRemoved = false;
          this.photoFile = null;

          this.form.patchValue({
            full_name: response.full_name,
            address: response.address,
            birth_date: response.birth_date,
            age: response.age !== null ? `${response.age} años` : '',
            curp: response.curp,
            employee_area_id: response.employee_area_id,
            position: response.position,
            entry_date: response.entry_date,
            discharge_date: response.discharge_date,
            reentry_date: response.reentry_date,
            weekly_salary: Number(response.weekly_salary ?? 0),
          });
        },
        error: (err) => {
          console.error('Error cargando detalle del empleado:', err);
        },
      });
  }

  private navigateToList(): void {
    this.revokePreviewIfBlob();
    this.router.navigateByUrl('/mano-de-obra/empleados');
  }

  private revokePreviewIfBlob(): void {
    if (this.photoPreview?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(this.photoPreview);
      } catch {}
    }
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