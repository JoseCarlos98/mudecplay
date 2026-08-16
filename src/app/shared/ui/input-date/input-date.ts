import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Optional,
  Self,
} from '@angular/core';
import { ControlValueAccessor, NgControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule, MatDateRangePicker } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
  styleUrls: ['./input-date.scss'],
})
export class InputDate implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() mode: DateInputMode = 'single';

  @Input() placeholder: string = 'Seleccionar fecha';
  @Input() startPlaceholder: string = 'Inicio';
  @Input() endPlaceholder: string = 'Fin';

  @Input() showClear: boolean = true;
  @Input() showError: boolean = false;

  @Input() requiredMessage: string = 'Este campo es obligatorio';
  @Input() errorMessage: string = 'Fecha inválida';

  @Input() maxDate: Date | string | null = null;
  @Input() allowFutureDates: boolean = false;

  disabled: boolean = false;

  singleDate: Date | null = null;

  startDate: Date | null = null;
  endDate: Date | null = null;

  private touched = false;

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Optional() @Self() private ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  private parseDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;

    if (value instanceof Date) return value;

    if (typeof value === 'string') {
      if (value.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        if (!y || !m || !d) return null;

        const parsed = new Date(y, m - 1, d);
        return isNaN(parsed.getTime()) ? null : parsed;
      }

      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  get effectiveMaxDate(): Date | null {
    if (this.maxDate) {
      return this.parseDate(this.maxDate);
    }

    if (!this.allowFutureDates) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return today;
    }

    return null;
  }

  private normalizeDate(date: Date | null): Date | null {
    if (!date) return null;

    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private applyMaxDate(date: Date | null): Date | null {
    if (!date) return null;

    const normalizedDate = this.normalizeDate(date);
    const normalizedMax = this.normalizeDate(this.effectiveMaxDate);

    if (!normalizedDate) return null;
    if (!normalizedMax) return normalizedDate;

    return normalizedDate.getTime() > normalizedMax.getTime() ? normalizedMax : normalizedDate;
  }

  writeValue(value: any): void {
    if (this.mode === 'single') {
      this.writeSingle(value);
    } else {
      this.writeRange(value);
    }
  }

  private writeSingle(value: any): void {
    this.singleDate = this.applyMaxDate(this.parseDate(value));
  }

  private writeRange(value: any): void {
    const v = value as { startDate?: Date | string | null; endDate?: Date | string | null } | null | undefined;

    if (!v) {
      this.startDate = null;
      this.endDate = null;
      return;
    }

    this.startDate = this.applyMaxDate(this.parseDate(v.startDate ?? null));
    this.endDate = this.applyMaxDate(this.parseDate(v.endDate ?? null));
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

  markAsTouched(): void {
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
    if (errors['matDatepickerMax']) return 'No puedes seleccionar una fecha futura';

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

  onSingleDateChange(date: Date | null): void {
    this.singleDate = this.applyMaxDate(date);
    this.onChange(toApiDate(this.singleDate));
  }

  clearSingle(): void {
    this.singleDate = null;
    this.onChange(null);
  }

  onRangeDateChange(kind: 'start' | 'end', date: Date | null): void {
    const safeDate = this.applyMaxDate(date);

    if (kind === 'start') {
      this.startDate = safeDate;
    } else {
      this.endDate = safeDate;
    }

    const value: DateRangeValue = {
      startDate: toApiDate(this.startDate),
      endDate: toApiDate(this.endDate),
    };

    this.onChange(value);
  }

  clearRange(picker: MatDateRangePicker<Date>): void {
    this.startDate = null;
    this.endDate = null;

    const empty: DateRangeValue = {
      startDate: null,
      endDate: null,
    };

    this.onChange(empty);
  }
}