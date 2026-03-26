import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';

import { AreasService } from '../../services/areas.service';
import * as entity from '../../interfaces/area-interfaces';

const HEADER_CONFIG: ModuleHeaderConfig = {
  modal: true,
};

@Component({
  selector: 'app-area-modal',
  imports: [
    CommonModule,
    MatDatepickerModule,
    ModuleHeader,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    InputField,
    BtnsSection,
  ],
  templateUrl: './area-modal.html',
  styleUrl: './area-modal.scss',
})
export class AreaModal implements OnInit {
  private readonly areasService = inject(AreasService);
  readonly data = inject<entity.AreaResponseDto | null>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AreaModal>);
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

    const formData: entity.CreateArea = {
      name: this.form.value.name?.trim() || '',
    };

    this.areasService.create(formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al guardar área:', err),
    });
  }

  updateData(): void {
    if (this.form.invalid || !this.data?.id) {
      this.form.markAllAsTouched();
      return;
    }

    const formData: entity.PatchArea = {
      name: this.form.value.name?.trim() || '',
    };

    this.areasService.update(this.data.id, formData).subscribe({
      next: (response) => {
        if (response.success) this.closeModal(true);
      },
      error: (err) => console.error('Error al editar área:', err),
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