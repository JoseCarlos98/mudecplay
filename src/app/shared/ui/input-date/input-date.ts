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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDateRangePicker } from '@angular/material/datepicker';
import { Validators } from '@angular/forms';

export type DateInputMode = 'single' | 'range';

export interface DateRangeValue {
  startDate: Date | null;
  endDate: Date | null;
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
  styleUrls: ['./input-date.scss'],
  // changeDetection: ChangeDetectionStrategy.OnPush,
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

  /** Estado interno */
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

  // ========== CVA ==========
  writeValue(value: any): void {
    if (this.mode === 'single') {
      this.writeSingle(value);
    } else {
      this.writeRange(value);
    }
  }

  private writeSingle(value: any) {
    if (value instanceof Date || value === null) {
      this.singleDate = value;
      return;
    }

    // soportar string 'YYYY-MM-DD'
    if (typeof value === 'string' && value) {
      const parsed = new Date(value);
      this.singleDate = isNaN(parsed.getTime()) ? null : parsed;
      return;
    }

    this.singleDate = null;
  }

  private writeRange(value: any) {
    const v = value as DateRangeValue | null | undefined;
    if (v) {
      this.startDate = v.startDate ?? null;
      this.endDate = v.endDate ?? null;
    } else {
      this.startDate = null;
      this.endDate = null;
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

    // Angular >=14
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
    this.onChange(date);
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
      startDate: this.startDate,
      endDate: this.endDate,
    };
    this.onChange(value);
  }

  clearRange(picker: MatDateRangePicker<Date>) {
    this.startDate = null;
    this.endDate = null;
    this.onChange({
      startDate: null,
      endDate: null,
    } as DateRangeValue);

    // opcional: reabrir picker después de limpiar
    picker.open();
  }
}
