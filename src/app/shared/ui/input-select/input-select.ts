import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Optional,
  Self,
} from '@angular/core';
import { ControlValueAccessor, NgControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface SelectCatalogOption {
  id: number | string;
  name: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-input-select',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './input-select.html',
  styleUrl: './input-select.scss',
})
export class InputSelect implements ControlValueAccessor {
  /** Config pública */
  @Input() label: string = '';
  @Input() placeholder: string = 'Todos';
  @Input() multiple: boolean = false;

  // <-- aquí mandas directamente tus catálogos { id, name }
  @Input() options: SelectCatalogOption[] = [];

  @Input() requiredMessage: string = 'Este campo es obligatorio';

  /** Estado interno */
  disabled: boolean = false;
  private touched = false;

  /** Valor interno ligado al mat-select */
  value: any = '';

  /** CVA */
  private onChange: (value: any) => void = () => { };
  private onTouched: () => void = () => { };

  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  // ========== CVA ==========
  writeValue(value: any): void {
    if (this.multiple) {
      if (Array.isArray(value)) {
        this.value = value;
      } else if (value == null) {
        this.value = [];
      } else {
        this.value = [value];
      }
    } else {
      // single: '' = "Todos"
      this.value = value ?? '';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // ========== UI / helpers ==========
  markAsTouched() {
    if (!this.touched) {
      this.onTouched();
      this.touched = true;
    }
  }

  onSelectionChange(event: MatSelectChange) {
    this.value = event.value;
    this.onChange(this.value);
  }

  clearSelection() {
    if (this.multiple) {
      this.value = [];
      this.onChange([]);
    } else {
      // single: volver a "Todos" (valor vacío)
      this.value = '';
      this.onChange('');
    }
  }

  get hasValue(): boolean {
    if (this.multiple) {
      return Array.isArray(this.value) && this.value.length > 0;
    }
    // single: '' equivale a "Todos" → no cuenta como filtro
    return this.value !== null && this.value !== undefined && this.value !== '';
  }

  get hasError(): boolean {
    if (!this.ngControl) return false;
    const c = this.ngControl.control;
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  get firstErrorMessage(): string {
    const control = this.ngControl?.control;
    const errors = control?.errors;
    if (!errors) return '';

    if (errors['required']) return this.requiredMessage;
    return this.requiredMessage;
  }

  get showRequiredMark(): boolean {
    const control = this.ngControl?.control;
    if (!control) return false;
    return control.hasValidator?.(Validators.required) ?? false;
  }
}