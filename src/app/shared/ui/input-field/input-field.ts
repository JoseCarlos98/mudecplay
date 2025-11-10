import { CommonModule } from '@angular/common';
import { Component, Input, Optional, Self } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './input-field.html',
  styleUrls: ['./input-field.scss'],
})
export class InputField implements ControlValueAccessor {
  // Inputs de configuración (lo que controla el que lo usa)
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: 'text' | 'money' | 'number' = 'text';
  @Input() prefix: string = '$';               // usado en money
  @Input() decimals: number = 2;               // usado en money
  @Input() showError: boolean = false;         // fallback si no hay NgControl
  @Input() errorMessage: string = 'Este campo es obligatorio';

  /*** Valor REAL que vive en el form (sin formato). */
  private _value: string | number | null = null;

  /** Indicador para saber si el input está enfocado */
  private isFocused: boolean = false;

  /** Valor que se muestra en pantalla (puede estar formateado) */
  displayValue: string = '';

  /** Estado disabled que viene del form */
  disabled: boolean = false;

  // callbacks que Angular nos inyecta
  private onChange: (value: any) => void = () => { };
  private onTouched: () => void = () => { };

  // Constructor: nos registramos como value accessor y
  // de paso tenemos acceso al control para mostrar errores.
  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  // Getters de estado de error (para mostrar mensajes)
  get hasError(): boolean {
    // si no tenemos control (uso fuera de form), usamos el @Input
    if (!this.ngControl) return this.showError;

    const control = this.ngControl.control;
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  get firstErrorMessage(): string {
    const control = this.ngControl?.control;
    const errors = control?.errors;
    if (!errors) return '';

    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['min']) return 'El valor es muy pequeño';
    if (errors['max']) return 'El valor es muy grande';

    // mensaje por defecto
    return this.errorMessage;
  }

  /** Angular nos pasa un valor desde el form */
  writeValue(value: any) {
    this._value = value;

    // si no está enfocado, mostramos con formato (por ej. money)
    this.displayValue = this.isFocused
      ? value ?? ''
      : this.formatForDisplay(value);
  }

  /** Angular nos da la función para notificar cambios */
  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  /** Angular nos da la función para notificar touched/blur */
  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  /** Angular deshabilita el control */
  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  // Eventos del input

  /** Cada vez que el usuario escribe */
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let raw = input.value;

    // no permitimos espacios
    raw = raw.replace(/\s+/g, '');

    // si es money, solo dejamos dígitos y un punto
    if (this.type === 'money') raw = raw.replace(/[^0-9.]/g, '');

    this._value = raw;
    this.displayValue = raw;

    this.onChange(this.normalizeValue(raw));
  }

  /** Cuando entra al input mostramos el valor crudo */
  onFocus() {
    this.isFocused = true;
    this.displayValue = this._value !== null ? String(this._value) : '';
  }

  /** Cuando sale del input mostramos el valor formateado */
  onBlur() {
    this.isFocused = false;
    this.onTouched();
    this.displayValue = this.formatForDisplay(this._value);
  }

  /** Validación de teclado en tiempo real */
  onKeyDown(event: KeyboardEvent) {
    if (this.type !== 'money' && this.type !== 'number') return;

    const allowedControlKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
    ];

    if (
      (event.ctrlKey || event.metaKey) &&
      ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())
    ) {
      return;
    }

    // permitir teclas de control
    if (allowedControlKeys.includes(event.key)) return;

    // permitir números
    if (event.key >= '0' && event.key <= '9') return;

    // permitir un solo punto si es money
    if (this.type === 'money' && event.key === '.') {
      const hasDot = (event.target as HTMLInputElement).value.includes('.');
      if (!hasDot) return;
    }

    // cualquier otra cosa la bloqueamos
    event.preventDefault();
  }

  // Helpers internos

  get showRequiredMark(): boolean {
    const control = this.ngControl?.control;
    if (!control || !control.validator) return false;

    const validationResult = control.validator({} as any);
    return !!validationResult?.['required'];
  }

  /**
   * Convierte lo que escribe el usuario en el valor que queremos
   * guardar en el formulario.
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
   * Convierte el valor real con formato al hacer blur
   */
  private formatForDisplay(value: any): string {
    if (this.type === 'money') {
      if (value === null || value === '' || value === undefined) return '';
      const num = Number(value);
      if (isNaN(num)) return '';

      return `${this.prefix} ${num.toLocaleString('es-MX', {
        minimumFractionDigits: this.decimals,
        maximumFractionDigits: this.decimals,
      })}`;
    }

    return value ?? '';
  }
}
