import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Optional,
  Self,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './input-field.html',
  styleUrls: ['./input-field.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputField implements ControlValueAccessor {
  // Config pública
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: 'text' | 'number' | 'money' = 'text';

  // MONEY
  @Input() prefix: string = '$';
  @Input() decimals: number = 2;

  // NUMBER (nuevo)
  @Input() numberDecimals: number = 0;         // máximo de decimales

  // Errores
  @Input() showError: boolean = false;
  @Input() errorMessage: string = 'Este campo es obligatorio';

  // Estado interno
  private _value: string | number | null = null;
  private isFocused = false;
  disabled = false;

  // Muestra en input
  displayValue: string = '';

  // CVA
  onChange: (value: any) => void = () => { };
  private onTouched: () => void = () => { };

  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  // ===== CVA =====
  writeValue(value: any) {
    this._value = value;
    this.displayValue = this.isFocused ? (value ?? '') : this.formatForDisplay(value);
  }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean) { this.disabled = isDisabled; }

  // ===== Atributos nativos útiles =====
  get inputMode(): 'decimal' | 'numeric' | undefined {
    if (this.type === 'money') return 'decimal';
    if (this.type === 'number') return this.numberDecimals ? 'decimal' : 'numeric';
    return undefined;
  }
  get autoCapitalize(): 'off' { return 'off'; }
  get autoComplete(): 'off' { return 'off'; }
  get pattern(): string | null {
    if (this.type === 'number') {
      return this.numberDecimals ? '[0-9]*[.,]?[0-9]*' : '\\d*';
    }
    if (this.type === 'money') return '[0-9]*[.,]?[0-9]*';
    return null;
  }

  get getPlaceholder(): string {
    if (this.placeholder) return this.placeholder;

    switch (this.type) {
      case 'money':
        return `${this.prefix} 0.00`;
      case 'number':
        return 'Ingrese un número';
      case 'text':
      default:
        return 'Ingrese texto';
    }
  }

  // ===== Eventos =====
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let raw = input.value ?? '';

    switch (this.type) {
      case 'money': {
        raw = this.sanitizeMoney(raw);
        this._value = this.normalizeMoney(raw);
        this.displayValue = raw;
        this.onChange(this._value);
        break;
      }
      case 'number': {
        raw = this.sanitizeNumber(raw);
        this._value = this.normalizeNumber(raw);
        this.displayValue = raw;
        this.onChange(this._value);
        break;
      }
      case 'text':
      default: {
        raw = this.sanitizeTextInline(raw);
        this._value = raw;
        this.displayValue = raw;
        this.onChange(raw);
      }
    }
  }

  onFocus() {
    this.isFocused = true;
    if (this.type === 'money') {
      const val = (this._value ?? '') as number | string;
      this.displayValue = val === null || val === '' ? '' : String(val);
    } else {
      this.displayValue = this._value !== null ? String(this._value) : '';
    }
  }

  onBlur() {
    this.isFocused = false;
    this.onTouched();

    switch (this.type) {
      case 'money': {
        this.displayValue = this.formatForDisplay(this._value);
        break;
      }
      case 'number': {
        // Normaliza a número (aplica límite de decimales), muestra sin formato
        const normalized = this.normalizeNumber(String(this._value ?? ''));
        this._value = normalized;
        this.onChange(normalized);
        this.displayValue = normalized === null ? '' : String(normalized);
        break;
      }
      case 'text': {
        const norm = this.normalizeTextOnBlur(String(this._value ?? ''));
        this._value = norm;
        this.onChange(norm);
        this.displayValue = norm;
        break;
      }
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) return;

    const controlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (controlKeys.includes(event.key)) return;

    if (this.type === 'number') {
      // Dígitos siempre permitidos, a menos que superen el máximo de decimales
      const isDigit = event.key >= '0' && event.key <= '9';
      const inputEl = event.target as HTMLInputElement;

      // Permitir separador decimal si aplica
      if (this.numberDecimals && (event.key === '.' || event.key === ',')) {
        const v = inputEl.value;
        const hasSep = /[.,]/.test(v);
        if (!hasSep) return; // primer separador permitido
        event.preventDefault(); // segundo separador no
        return;
      }

      if (isDigit) {
        if (this.numberDecimals) {
          const v = inputEl.value.replace(',', '.');
          const sep = v.indexOf('.');
          if (sep !== -1) {
            const selStart = inputEl.selectionStart ?? v.length;
            const selEnd = inputEl.selectionEnd ?? v.length;
            const selectionLen = selEnd - selStart;

            // ¿Caret en la parte decimal SIN selección?
            const caretInDecimals = selStart > sep;
            if (caretInDecimals && selectionLen === 0) {
              const decimalsCount = v.slice(sep + 1).length;
              if (decimalsCount >= this.numberDecimals) {
                event.preventDefault(); // bloquea más decimales
                return;
              }
            }
          }
        }
        return; // dígito permitido
      }

      // Cualquier otra tecla: bloquear
      event.preventDefault();
      return;
    }

    if (this.type === 'money') {
      if (event.key >= '0' && event.key <= '9') return;
      if (event.key === '.' || event.key === ',') {
        const v = (event.target as HTMLInputElement).value;
        const hasSep = /[.,]/.test(v);
        if (!hasSep) return;
      }
      event.preventDefault();
      return;
    }
    // text: sin restricciones de teclado
  }

  // ===== Errores / UI =====
  get hasError(): boolean {
    if (!this.ngControl) return this.showError;
    const c = this.ngControl.control;
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  get firstErrorMessage(): string {
    const control = this.ngControl?.control;
    const errors = control?.errors;
    if (!errors) return '';
    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['blank']) return 'No se permiten sólo espacios';
    if (errors['min']) return 'El valor es muy pequeño';
    if (errors['max']) return 'El valor es muy grande';
    return this.errorMessage;
  }

  get showRequiredMark(): boolean {
    const control = this.ngControl?.control;
    if (!control || !control.validator) return false;
    const res = control.validator({} as any);
    return !!res?.['required'];
  }

  // ===== Sanitizers / Normalizers / Formatters =====
  // TEXT
  private sanitizeTextInline(v: string): string {
    return v.replace(/\s+/g, ' ').replace(/^\s+/, '');
  }
  private normalizeTextOnBlur(v: string): string {
    return v.replace(/\s+/g, ' ').trim();
  }

  // NUMBER (con o sin decimales)
  private sanitizeNumber(v: string): string {
    v = (v ?? '').replace(/\s+/g, '').replace(/,/g, '.');
    // deja dígitos y puntos
    v = v.replace(/[^0-9.]/g, '');
    if (!this.numberDecimals) {
      // si no se permiten decimales, elimina todos los puntos
      return v.replace(/\./g, '');
    }
    // si se permiten, conservar solo el primer punto
    const firstDot = v.indexOf('.');
    if (firstDot !== -1) {
      const before = v.slice(0, firstDot + 1);
      let after = v.slice(firstDot + 1).replace(/\./g, '');
      if (this.numberDecimals >= 0) {
        after = after.slice(0, this.numberDecimals); // límite de decimales
      }
      v = before + after;
    }
    return v;
  }

  private normalizeNumber(v: string): number | null {
    const s = this.sanitizeNumber(v);
    if (s === '' || s === '.') return null;
    let n = Number(s);
    if (Number.isNaN(n)) return null;

    if (this.numberDecimals && this.numberDecimals >= 0) {
      const factor = Math.pow(10, this.numberDecimals);
      n = Math.round(n * factor) / factor; // redondea al máximo de decimales permitido
    }
    return n;
  }

  // MONEY
  private sanitizeMoney(v: string): string {
    v = v.replace(/\s+/g, '').replace(/,/g, '.');
    v = v.replace(/[^0-9.]/g, '');
    const firstDot = v.indexOf('.');
    if (firstDot !== -1) {
      const before = v.slice(0, firstDot + 1);
      let after = v.slice(firstDot + 1).replace(/\./g, '');
      after = after.slice(0, this.decimals);
      v = before + after;
    }
    return v;
  }

  private normalizeMoney(v: string): number | null {
    if (!v) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

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
    // number/text: mostrar tal cual
    return value ?? '';
  }
}
