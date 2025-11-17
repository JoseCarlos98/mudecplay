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
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { normalizeMoney, normalizeTextOnBlur } from '../../helpers/general-helpers';

type InputKind = 'text' | 'number' | 'money';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  templateUrl: './input-field.html',
  styleUrls: ['./input-field.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputField implements ControlValueAccessor {
  /** Config pública */
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: InputKind = 'text';

  /** MONEY */
  @Input() prefix: string = '$';
  @Input() decimals: number = 2;
  @Input() numberDecimals?: number;

  /** Opcionales útiles */
  @Input() allowNegative: boolean = false;
  @Input() errorMessage: string = 'Este campo es obligatorio';
  @Input() showError: boolean = false;

  /** Estado interno */
  private _value: string | number | null = null;
  private isFocused: boolean = false;
  disabled: boolean = false;
  displayValue: string = '';

  /** CVA */
  private onChange: (value: any) => void = () => { };
  private onTouched: () => void = () => { };

  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  // ======= Derivados/UI =======
  private get maxNumDecimals(): number {
    const d = this.numberDecimals;
    return Number.isFinite(d) && (d as number) > 0 ? Math.floor(d as number) : 0;
  }

  get inputMode(): 'decimal' | 'numeric' | undefined {
    if (this.type === 'money') return 'decimal';
    if (this.type === 'number') return this.maxNumDecimals ? 'decimal' : 'numeric';
    return undefined;
  }

  get autoCapitalize(): 'off' { return 'off'; }

  get autoComplete(): 'off' { return 'off'; }

  get pattern(): string | null {
    if (this.type === 'money') return '[0-9]*[.,]?[0-9]*';
    if (this.type === 'number') {
      const core = this.maxNumDecimals ? '[0-9]*[.,]?[0-9]*' : '\\d*';
      return this.allowNegative ? `^-?${core}$` : `^${core}$`;
    }
    return null;
  }

  get resolvedPlaceholder(): string {
    if (this.placeholder) return this.placeholder;
    switch (this.type) {
      case 'money': return `${this.prefix} 0.00`;
      case 'number': {
        if (!this.maxNumDecimals || this.maxNumDecimals <= 0) return '0';
        const zeros = '0'.repeat(this.maxNumDecimals);
        return `0.${zeros}`;
      }
      default: return 'Ingrese texto';
    }
  }

  // ======= CVA =======
  writeValue(value: any) {
    this._value = value;

    if (this.type === 'money') {
      // money: muestra crudo en foco, formateado fuera de foco
      this.displayValue = this.isFocused ? (value ?? '') : this.formatMoney(value);
      return;
    }

    // number/text: mostrar “tal cual” lo que hay
    this.displayValue = value !== null && value !== undefined ? String(value) : '';
  }

  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean) { this.disabled = isDisabled; }

  // ======= Eventos (routing por tipo para legibilidad) =======
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value ?? '';

    if (this.type === 'money') {
      this.handleInputMoney(raw);
    } else if (this.type === 'number') {
      this.handleInputNumber(raw);
    } else {
      this.handleInputText(raw);
    }
  }

  onFocus() {
    this.isFocused = true;
    if (this.type === 'money') {
      // money: mostrar el valor crudo (sin formato)
      this.displayValue = this._value !== null ? String(this._value) : '';
    } else {
      // number/text
      this.displayValue = this._value !== null ? String(this._value) : '';
    }
  }

  onBlur() {
    this.isFocused = false;
    this.onTouched();

    if (this.type === 'money') {
      this.displayValue = this.formatMoney(this._value);
      return;
    }

    if (this.type === 'number') {
      // Normaliza definitivamente y muestra limpio
      const normalized = this.normalizeNumber(String(this._value ?? ''));
      this._value = normalized;
      this.onChange(normalized);
      this.displayValue = normalized === null ? '' : String(normalized);
      return;
    }

    if (this.type === 'text') {
      const norm = normalizeTextOnBlur(String(this._value ?? ''));
      this._value = norm;
      this.onChange(norm);
      this.displayValue = norm;
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.allowShortcut(event)) return;
    if (this.isControlKey(event)) return;

    if (this.type === 'number') {
      this.keyguardNumber(event);
      return;
    }
    if (this.type === 'money') {
      this.keyguardMoney(event);
      return;
    }
  }

  clear() {
    // Limpia según tipo y propaga
    if (this.type === 'money' || this.type === 'number') {
      this._value = null;
      this.onChange(null);
      this.displayValue = '';
      return;
    }
    this._value = '';
    this.onChange('');
    this.displayValue = '';
  }

  // ======= Errores / UI =======
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
    if (errors['blank']) return 'No se permiten solo espacios';
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

  // ======= Handlers por tipo =======
  private handleInputText(v: string) {
    const clean = v.replace(/\s+/g, ' ').replace(/^\s+/, '');
    this._value = clean;
    this.displayValue = clean;
    this.onChange(clean);
  }

  private handleInputNumber(v: string) {
    let s = (v ?? '').replace(/\s+/g, '').replace(/,/g, '.');

    // signo
    if (this.allowNegative) {
      // conserva solo un '-' y solo al inicio
      s = s.replace(/-/g, '');
      if (v.trim().startsWith('-')) s = '-' + s;
    } else {
      s = s.replace(/-/g, '');
    }

    // dígitos + punto
    s = s.replace(/[^0-9.\-]/g, '');

    if (!this.maxNumDecimals) {
      s = s.replace(/\./g, ''); // enteros
    } else {
      // solo un punto y recortar decimales
      const firstDot = s.indexOf('.');
      if (firstDot !== -1) {
        const before = s.slice(0, firstDot + 1);
        let after = s.slice(firstDot + 1).replace(/\./g, '');
        after = after.slice(0, this.maxNumDecimals);
        s = before + after;
      }
    }

    this._value = this.normalizeNumber(s);
    this.displayValue = s;
    this.onChange(this._value);
  }

  private handleInputMoney(v: string) {
    let s = v.replace(/\s+/g, '').replace(/,/g, '.');
    s = s.replace(/[^0-9.]/g, '');
    const firstDot = s.indexOf('.');
    if (firstDot !== -1) {
      const before = s.slice(0, firstDot + 1);
      let after = s.slice(firstDot + 1).replace(/\./g, '');
      after = after.slice(0, this.decimals);
      s = before + after;
    }
    this._value = normalizeMoney(s);
    this.displayValue = s;
    this.onChange(this._value);
  }

  // ======= Keyguards =======
  private keyguardNumber(event: KeyboardEvent) {
    const key = event.key;
    const input = event.target as HTMLInputElement;

    const isDigit = key >= '0' && key <= '9';
    if (isDigit) {
      if (this.maxNumDecimals) {
        const v = input.value.replace(',', '.');
        const dot = v.indexOf('.');
        if (dot !== -1) {
          const selStart = input.selectionStart ?? v.length;
          const selEnd = input.selectionEnd ?? v.length;
          const selectionLen = selEnd - selStart;
          const inDecimals = selStart > dot;
          if (inDecimals && selectionLen === 0) {
            const decCount = v.slice(dot + 1).length;
            if (decCount >= this.maxNumDecimals) {
              event.preventDefault();
              return;
            }
          }
        }
      }
      return;
    }

    // separador decimal
    if (this.maxNumDecimals && (key === '.' || key === ',')) {
      const v = input.value;
      if (!/[.,]/.test(v)) return; // primer separador ok
      event.preventDefault();
      return;
    }

    // signo negativo
    if (this.allowNegative && key === '-') {
      const v = input.value;
      const caret = input.selectionStart ?? 0;
      const alreadyHas = v.includes('-');
      // permitir solo si caret al inicio y no existe
      if (!alreadyHas && caret === 0) return;
      event.preventDefault();
      return;
    }

    // otro: bloquear
    event.preventDefault();
  }

  private keyguardMoney(event: KeyboardEvent) {
    const key = event.key;
    if (key >= '0' && key <= '9') return;
    if (key === '.' || key === ',') {
      const v = (event.target as HTMLInputElement).value;
      if (!/[.,]/.test(v)) return;
    }
    if (this.isControlKey(event)) return;
    if (this.allowShortcut(event)) return;
    event.preventDefault();
  }

  private isControlKey(e: KeyboardEvent) {
    return ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key);
  }

  private allowShortcut(e: KeyboardEvent) {
    return (e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase());
  }

  // ======= Normalizadores / Formateadores =======
  private normalizeNumber(s: string): number | null {
    if (s === '' || s === '.' || s === '-' || s === '-.') return null;
    const normalized = s.replace(',', '.');
    const n = Number(normalized);
    if (Number.isNaN(n)) return null;

    if (this.maxNumDecimals) {
      const factor = Math.pow(10, this.maxNumDecimals);
      return Math.round(n * factor) / factor;
    }
    return Math.trunc(n);
  }

  private formatMoney(value: any): string {
    if (value === null || value === '' || value === undefined) return '';
    const num = Number(value);
    if (isNaN(num)) return '';
    return `${this.prefix} ${num.toLocaleString('es-MX', {
      minimumFractionDigits: this.decimals,
      maximumFractionDigits: this.decimals,
    })}`;
  }
}
