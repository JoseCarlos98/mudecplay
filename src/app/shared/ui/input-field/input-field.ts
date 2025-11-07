import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './input-field.html',
  styleUrl: './input-field.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputField),
      multi: true
    }
  ]
})
export class InputField implements ControlValueAccessor {
  // CONFIGURACIÓN
  @Input() label = '';
  @Input() placeholder: string = '';
  @Input() type: 'text' | 'money' | 'number' = 'text';
  @Input() prefix = '$';
  @Input() decimals = 2;
  @Input() required: boolean = false;

  /** valor REAL que se manda al form (sin formato) */
  private _value: string | number | null = null;
  private isFocused = false;

  displayValue: string = '';

  private onChange: (value: any) => void = () => { };
  private onTouched: () => void = () => { };

  writeValue(value: any): void {
    this._value = value;
    // si no está enfocado, mostramos formateado (money)
    if (!this.isFocused) {
      this.displayValue = this.formatForDisplay(value);
    } else {
      this.displayValue = value ?? '';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    // si luego quieres manejar disabled, aquí
  }

  //  EVENTOS DEL INPUT
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let raw = input.value;

    if (this.type === 'money') {
      // dejamos solo números y punto
      raw = raw.replace(/[^0-9.]/g, '');
    }

    this._value = raw;
    this.displayValue = raw;
    this.onChange(this.normalizeValue(raw));
  }

  onFocus() {
    this.isFocused = true;
    // en focus muestro crudo
    this.displayValue = this._value !== null ? String(this._value) : '';
  }

  onBlur() {
    this.isFocused = false;
    this.onTouched();
    // en blur formateo si es money
    this.displayValue = this.formatForDisplay(this._value);
  }

  /**
  * Normaliza lo que escriba el usuario a lo que quieres guardar en el form.
  * Para money, lo ideal es guardar número.
  */
  private normalizeValue(raw: string): number | null {
    if (this.type === 'money') {
      if (raw === '') return null;
      const n = Number(raw);
      return isNaN(n) ? null : n;
    }
    return raw as any;
  }

  /**
   * Formatea para mostrar en el input cuando está blur.
   */
  private formatForDisplay(value: any): string {
    if (this.type === 'money') {
      if (value === null || value === '' || value === undefined) return '';
      const num = Number(value);
      if (isNaN(num)) return '';
      // formateo sencillo con toLocaleString
      return `${this.prefix} ${num.toLocaleString('es-MX', {
        minimumFractionDigits: this.decimals,
        maximumFractionDigits: this.decimals,
      })}`;
    }

    return value ?? '';
  }
}
