import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';

import { EmployeeAreasService } from '../../services/employee-areas.service';
import * as entity from '../../interfaces/employee-area-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-employee-area-modal',
  imports: [
    CommonModule,
    ModuleHeader,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    InputField,
    BtnsSection,
  ],
  templateUrl: './employee-area-modal.html',
  styleUrl: './employee-area-modal.scss',
})
export class EmployeeAreaModal implements OnInit {
  private readonly employeeAreasService = inject(EmployeeAreasService);
  readonly data = inject<entity.EmployeeAreaResponseDto | null>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EmployeeAreaModal>);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;

  form = this.fb.group({
    name: this.fb.control<string | null>(null, {
      validators: [Validators.required, Validators.maxLength(150)],
    }),
  });

  ngOnInit(): void {
    if (this.data?.id) {
      this.form.patchValue({
        name: this.data.name,
      });
    }
  }

  saveData(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData: entity.CreateEmployeeArea = {
      name: this.form.value.name?.trim() || '',
    };

    this.employeeAreasService.create(formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al guardar área de empleado:', err),
    });
  }

  updateData(): void {
    if (this.form.invalid || !this.data?.id) {
      this.form.markAllAsTouched();
      return;
    }

    const formData: entity.PatchEmployeeArea = {
      name: this.form.value.name?.trim() || '',
    };

    this.employeeAreasService.update(this.data.id, formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al editar área de empleado:', err),
    });
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'save':
        if (this.data?.id) {
          this.updateData();
        } else {
          this.saveData();
        }
        break;

      case 'cancel':
        this.closeModal();
        break;
    }
  }

  closeModal(saved?: boolean): void {
    this.dialogRef.close(!!saved);
  }
}