import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { finalize } from 'rxjs';
import { ModuleHeaderConfig } from '../../../../shared/ui/module-header/interfaces/module-header-interface';
import { ModuleHeader } from '../../../../shared/ui/module-header/module-header';
import { InputField } from '../../../../shared/ui/input-field/input-field';
import { InputSelect } from '../../../../shared/ui/input-select/input-select';
import { BtnsSection } from '../../../../shared/ui/btns-section/btns-section';
import { UsersService } from '../../services/user.service';
import { Catalog } from '../../../../shared/interfaces/general-interfaces';
import { CreateUserPayload, RoleCode, UpdateUserPayload, UserResponseDto } from '../../interfaces/users-interfaces';
import { CatalogsService } from '../../../../shared/services/catalogs.service';


const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

// Validator: password === confirm
function samePassword(group: AbstractControl): ValidationErrors | null {
  const p = group.get('password')?.value;
  const c = group.get('passwordConfirm')?.value;
  if (!p && !c) return null;
  return p === c ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    ModuleHeader,
    InputField,
    InputSelect,
    BtnsSection,
  ],
  templateUrl: './user-modal.html',
  styleUrl: './user-modal.scss',
})
export class UserModal {
  private readonly usersService = inject(UsersService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly dialogRef = inject(MatDialogRef<UserModal>);
  readonly data = inject<UserResponseDto | null>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;

  // catálogo roles
  rolesCatalog: Catalog[] = [];

  // estado activo
  activeOptions: Catalog[] = [
    { id: true as any, name: 'Activo' },
    { id: false as any, name: 'Inactivo' },
  ];

  // si es edición
  get isEdit(): boolean {
    return !!this.data?.id;
  }

  // form
  form: FormGroup = this.fb.group(
    {
      name: this.fb.control<string>('', { validators: [Validators.required] }),
      lastName: this.fb.control<string>('', { validators: [Validators.required] }),
      email: this.fb.control<string>('', { validators: [Validators.required, Validators.email] }),
      isActive: this.fb.control<boolean>(true, { validators: [Validators.required] }),

      roles: this.fb.control<RoleCode[]>([], { validators: [Validators.required] }),

      // password (create obligatorio, edit opcional)
      password: this.fb.control<string>(''),
      passwordConfirm: this.fb.control<string>(''),
    },
    { validators: [samePassword] },
  );

  ngOnInit(): void {
    this.loadRoles();
    console.log(this.data);
    

    if (this.data?.id) {
      this.form.patchValue({
        name: this.data.name,
        lastName: this.data.lastName,
        email: this.data.email,
        isActive: this.data.isActive,
        roles: this.data.roles ?? [],
      });
    } else {
      // create: password requerido
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('passwordConfirm')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('password')?.updateValueAndValidity();
      this.form.get('passwordConfirm')?.updateValueAndValidity();
    }
  }

  private loadRoles(): void {
    this.catalogsService.rolesCatalog().subscribe({
      next: (roles) => (this.rolesCatalog = roles),
      error: (err) => console.error('Error al cargar roles:', err),
    });
  }

  saveData() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    const payload: CreateUserPayload = {
      name: v.name,
      lastName: v.lastName,
      email: v.email,
      isActive: v.isActive,
      roleCodes: v.roles,
      password: v.password,
    };

    console.log(payload);
    
    this.usersService
      .create(payload)
      .subscribe({
        next: (response) => {          
          if (response.success) this.closeModal(true);
        },
        error: (err) => console.error('Error al guardar usuario:', err),
      });
  }

  updateData() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    const payload: UpdateUserPayload = {
      name: v.name,
      lastName: v.lastName,
      email: v.email,
      isActive: v.isActive,
      roleCodes: v.roles,
      // password solo si lo capturaron (edit opcional)
      ...(v.password?.trim() ? { password: v.password } : {}),
    };

    this.usersService
      .update(this.data?.id!, payload)
      .subscribe({
        next: (response) => {
          if (response.success) this.closeModal(true);
        },
        error: (err) => console.error('Error al editar usuario:', err),
      });
  }


  onBtnsSectionAction(action: string): void {
    if (action === 'cancel') this.closeModal(false);
  }

  closeModal(saved?: boolean): void {
    this.dialogRef.close(!!saved);
  }

  // helpers UI
  get passwordMismatch(): boolean {
    return !!this.form.errors?.['passwordMismatch'];
  }
}
