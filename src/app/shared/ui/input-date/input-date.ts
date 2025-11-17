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
import { MatDatepickerModule, MatDateRangePicker } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Validators } from '@angular/forms';
import { toApiDate } from '../../helpers/general-helpers';

export type DateInputMode = 'single' | 'range';

export interface DateRangeValue {
  startDate: string | null;
  endDate: string | null;
}

@Component({
  selector: 'app-input-date',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './input-date.html',
})
export class InputDate implements ControlValueAccessor {
  /** Config pública */
  @Input() label: string = '';
  @Input() mode: DateInputMode = 'single';

  @Input() placeholder: string = 'Seleccionar fecha';
  @Input() startPlaceholder: string = 'Inicio';
  @Input() endPlaceholder: string = 'Fin';

  @Input() showClear: boolean = true;
  @Input() showError: boolean = false;

  @Input() requiredMessage: string = 'Este campo es obligatorio';
  @Input() errorMessage: string = 'Fecha inválida';

  disabled: boolean = false;

  // single
  singleDate: Date | null = null;

  // range
  startDate: Date | null = null;
  endDate: Date | null = null;

  private touched = false;

  /** CVA */
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  // ========== Helpers de parseo ==========
  private parseDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;

    if (value instanceof Date) return value;

    if (typeof value === 'string') {
      // 'YYYY-MM-DD'
      if (value.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        if (!y || !m || !d) return null;
        const dte = new Date(y, m - 1, d);
        return isNaN(dte.getTime()) ? null : dte;
      }

      // ISO u otro formato parseable
      const dte = new Date(value);
      return isNaN(dte.getTime()) ? null : dte;
    }

    return null;
  }

  // ========== CVA ==========
  writeValue(value: any): void {
    if (this.mode === 'single') {
      this.writeSingle(value);
    } else {
      this.writeRange(value);
    }
  }

  private writeSingle(value: any) {
    // value puede ser: Date | 'YYYY-MM-DD' | '2025-11-04T07:00:00.000Z' | null
    this.singleDate = this.parseDate(value);
  }

  private writeRange(value: any) {
    const v = value as { startDate?: Date | string | null; endDate?: Date | string | null } | null | undefined;
    if (!v) {
      this.startDate = null;
      this.endDate = null;
      return;
    }

    this.startDate = this.parseDate(v.startDate ?? null);
    this.endDate = this.parseDate(v.endDate ?? null);
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

  get hasError(): boolean {
    if (!this.ngControl) return this.showError;
    const c = this.ngControl.control;
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  get firstErrorMessage(): string {
    const control = this.ngControl?.control;
    const errors = control?.errors;
    if (!errors) return '';

    if (errors['required']) return this.requiredMessage;
    if (errors['matDatepickerParse']) return 'Formato de fecha inválido';
    if (errors['matDatepickerMin']) return 'La fecha es demasiado pequeña';
    if (errors['matDatepickerMax']) return 'La fecha es demasiado grande';
    return this.errorMessage;
  }

  get showRequiredMark(): boolean {
    const control = this.ngControl?.control;
    if (!control) return false;
    return control.hasValidator?.(Validators.required) ?? false;
  }

  get hasSingleValue(): boolean {
    return !!this.singleDate;
  }

  get hasRangeValue(): boolean {
    return !!this.startDate || !!this.endDate;
  }

  // ========== Eventos single ==========
  onSingleDateChange(date: Date | null) {
    this.singleDate = date;

    const apiValue = toApiDate(date); // string | null
    this.onChange(apiValue);
  }

  clearSingle() {
    this.singleDate = null;
    this.onChange(null);
  }

  // ========== Eventos range ==========
  onRangeDateChange(kind: 'start' | 'end', date: Date | null) {
    if (kind === 'start') {
      this.startDate = date;
    } else {
      this.endDate = date;
    }

    const value: DateRangeValue = {
      startDate: toApiDate(this.startDate),
      endDate: toApiDate(this.endDate),
    };

    this.onChange(value);
  }

  clearRange(picker: MatDateRangePicker<Date>) {
    this.startDate = null;
    this.endDate = null;

    const empty: DateRangeValue = {
      startDate: null,
      endDate: null,
    };
    
    this.onChange(empty);
  }
}
