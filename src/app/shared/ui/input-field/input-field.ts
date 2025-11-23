import { CommonModule } from '@angular/common';
import {
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

type InputKind = 'text' | 'number' | 'money' | 'phone';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  templateUrl: './input-field.html',
  styleUrls: ['./input-field.scss'],
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

  /** PHONE */
  @Input() phonePrefix: string = '+52';   // se usará para emitir: +52 + digits
  @Input() phoneLength: number = 10;      // dígitos sin contar el prefijo

  /** Opcionales útiles */
  @Input() allowNegative: boolean = false;
  @Input() errorMessage: string = 'Este campo es obligatorio';
  @Input() showError: boolean = false;

  /** Estado interno */
  private _value: string | number | null = null; // money/number/text o string completo phone (+52xxxxx)
  private _phoneDigits: string = '';             // SOLO dígitos del teléfono sin prefijo
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
    if (this.type === 'phone') return 'numeric';
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
    if (this.type === 'phone') {
      // solo dígitos; el límite real lo controla maxlength
      return '\\d*';
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
      case 'phone': return 'Ingrese telefono';
      default: return 'Ingrese texto';
    }
  }

  // ======= CVA =======
  writeValue(value: any) {
    // PHONE
    if (this.type === 'phone') {
      const raw = value != null ? String(value) : '';
      const digits = raw.replace(/\D/g, ''); // "+52 668..." => "52668..."

      const countryDigits = this.phonePrefix.replace(/\D/g, ''); // "52"
      let phoneDigits = digits;

      if (countryDigits && digits.startsWith(countryDigits) && digits.length > this.phoneLength) {
        phoneDigits = digits.slice(countryDigits.length);
      }

      // seguridad: últimos N dígitos
      phoneDigits = phoneDigits.slice(-this.phoneLength);

      this._phoneDigits = phoneDigits;
      this._value = raw;
      this.displayValue = this.formatPhone(phoneDigits);   // 👈 AHORA FORMATEADO
      return;
    }

    // resto igual que lo tenías…
    this._value = value;

    if (this.type === 'money') {
      this.displayValue = this.isFocused ? (value ?? '') : this.formatMoney(value);
      return;
    }

    this.displayValue = value !== null && value !== undefined ? String(value) : '';
  }


  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean) { this.disabled = isDisabled; }

  // ======= Eventos =======
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value ?? '';

    if (this.type === 'money') {
      this.handleInputMoney(raw);
    } else if (this.type === 'number') {
      this.handleInputNumber(raw);
    } else if (this.type === 'phone') {
      this.handleInputPhone(raw);
    } else {
      this.handleInputText(raw);
    }
  }

  onFocus() {
    this.isFocused = true;

    if (this.type === 'money') {
      this.displayValue = this._value !== null ? String(this._value) : '';
      return;
    }

    if (this.type === 'phone') {
      this.displayValue = this.formatPhone(this._phoneDigits); // 👈 también formateado en foco
      return;
    }

    this.displayValue = this._value !== null ? String(this._value) : '';
  }


  onBlur() {
    this.isFocused = false;
    this.onTouched();

    if (this.type === 'money') {
      this.displayValue = this.formatMoney(this._value);
      return;
    }

    if (this.type === 'number') {
      const normalized = this.normalizeNumber(String(this._value ?? ''));
      this._value = normalized;
      this.onChange(normalized);
      this.displayValue = normalized === null ? '' : String(normalized);
      return;
    }

    if (this.type === 'phone') {
      this.displayValue = this.formatPhone(this._phoneDigits);  // 👈 se queda bonito al salir
      return;
    }

    // text...
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
    if (this.type === 'phone') {
      this.keyguardPhone(event);
      return;
    }
  }

  clear() {
    if (this.type === 'money' || this.type === 'number') {
      this._value = null;
      this.onChange(null);
      this.displayValue = '';
      return;
    }

    if (this.type === 'phone') {
      this._phoneDigits = '';
      this._value = '';
      this.onChange('');
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
    if (errors['phoneLength']) return `Debe contener ${this.phoneLength} dígitos`;
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

    if (this.allowNegative) {
      s = s.replace(/-/g, '');
      if (v.trim().startsWith('-')) s = '-' + s;
    } else {
      s = s.replace(/-/g, '');
    }

    s = s.replace(/[^0-9.\-]/g, '');

    if (!this.maxNumDecimals) {
      s = s.replace(/\./g, '');
    } else {
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

  private handleInputPhone(v: string) {
    // solo dígitos, máximo phoneLength
    const digits = (v ?? '').replace(/\D/g, '').slice(0, this.phoneLength);

    this._phoneDigits = digits;
    this.displayValue = this.formatPhone(digits);   // 👈 mostramos con espacios

    // Valor real que se emite al form
    const full = digits ? `${this.phonePrefix}${digits}` : '';
    this._value = full;
    this.onChange(full);

    this.applyPhoneError(digits);
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

    if (this.maxNumDecimals && (key === '.' || key === ',')) {
      const v = input.value;
      if (!/[.,]/.test(v)) return;
      event.preventDefault();
      return;
    }

    if (this.allowNegative && key === '-') {
      const v = input.value;
      const caret = input.selectionStart ?? 0;
      const alreadyHas = v.includes('-');
      if (!alreadyHas && caret === 0) return;
      event.preventDefault();
      return;
    }

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

  private keyguardPhone(event: KeyboardEvent) {
    const key = event.key;
    const isDigit = key >= '0' && key <= '9';
    if (isDigit) return;
    if (this.isControlKey(event) || this.allowShortcut(event)) return;
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

  // ======= Helpers phone =======
  private applyPhoneError(cleanDigits: string): void {
    const control = this.ngControl?.control;
    if (!control) return;

    const current = { ...(control.errors || {}) };

    if (cleanDigits && cleanDigits.length !== this.phoneLength) current['phoneLength'] = true;
    else delete current['phoneLength'];

    control.setErrors(Object.keys(current).length ? current : null);
  }

  private formatPhone(digits: string): string {
    const clean = (digits || '').replace(/\D/g, '').slice(0, this.phoneLength);

    if (!clean) return '';

    // <= 3 dígitos: solo lo que lleve
    if (clean.length <= 3) {
      return clean;
    }

    // 4 a 6 dígitos: 668 3 / 668 39 / 668 397
    if (clean.length <= 6) {
      return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    }

    // 7 a 10 dígitos: 668 397 6547 (3-3-4)
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }


}
