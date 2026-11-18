import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, distinctUntilChanged, finalize, Observable, of, startWith, switchMap } from 'rxjs';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { BtnsSection } from '../../../../../shared/ui/btns-section/btns-section';
import { InputField } from '../../../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../../../shared/ui/input-date/input-date';
import { InputSelect, SelectCatalogOption } from '../../../../../shared/ui/input-select/input-select';
import { CatalogsService } from '../../../../../shared/services/catalogs.service';
import { DailyAssistanceService } from '../../../daily-assistance/services/daily-assistance.service';
import { EmployeeAttendanceCatalogRow } from '../../../daily-assistance/interfaces/daily-assistance-interfaces';
import { OvertimeService } from '../../services/overtime.service';
import {
  CreatedLabourOvertimeDto,
  CreatedLabourSundayDto,
  CreateLabourOvertimeDto,
  CreateLabourSundayDto,
} from '../../interfaces/overtime-interfaces';

export type OvertimeFormModalKind = 'overtime' | 'sunday';
export interface OvertimeFormModalData {
  kind: OvertimeFormModalKind;
  defaultDate: string; // YYYY-MM-DD
}

const HEADER_CONFIG: ModuleHeaderConfig = { modal: true };

@Component({
  selector: 'app-modal-overtime-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, ModuleHeader,
    BtnsSection, InputField, InputDate, InputSelect,
  ],
  templateUrl: './modal-overtime-form.html',
  styleUrl: './modal-overtime-form.scss',
})
export class ModalOvertimeForm implements OnInit {
  readonly data = inject<OvertimeFormModalData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModalOvertimeForm>);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly extraApi = inject(OvertimeService);
  private readonly attendanceApi = inject(DailyAssistanceService);
  private readonly catalogsApi = inject(CatalogsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly headerConfig = HEADER_CONFIG;
  saving = false;
  loadingEmployees = false;
  loadingProjects = false;
  employees: EmployeeAttendanceCatalogRow[] = [];
  employeeOptions: SelectCatalogOption[] = [];
  projectOptions: SelectCatalogOption[] = [];

  readonly minutesOptions: SelectCatalogOption[] = Array.from({ length: 60 }, (_, minute) => ({
    id: minute,
    name: String(minute).padStart(2, '0'),
  }));

  readonly form = this.fb.nonNullable.group({
    employee_id: [0, [Validators.required, Validators.min(1)]],
    project_id: [0, [Validators.required, Validators.min(1)]],
    work_date: [this.data.defaultDate, [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
    overtime_hours: [1, [Validators.required, Validators.min(0), Validators.max(24)]],
    overtime_minutes: [0, [Validators.required, Validators.min(0), Validators.max(59)]],
    worked_until: ['13:00', Validators.required],
  });

  get isOvertime(): boolean { return this.data.kind === 'overtime'; }
  get modalTitle(): string { return this.isOvertime ? 'Registrar horas extra' : 'Registrar domingo trabajado'; }

  get selectedEmployeeName(): string {
    const id = Number(this.form.controls.employee_id.value);
    return this.employees.find((employee) => Number(employee.id) === id)?.full_name ?? 'Sin seleccionar';
  }

  get selectedAreaName(): string {
    const id = Number(this.form.controls.employee_id.value);
    return this.employees.find((employee) => Number(employee.id) === id)?.employee_area_name ?? 'Sin área';
  }

  get selectedProjectName(): string {
    const id = Number(this.form.controls.project_id.value);
    return this.projectOptions.find((project) => Number(project.id) === id)?.name ?? 'Sin seleccionar';
  }

  get displayDate(): string {
    const date = this.form.controls.work_date.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  get formattedDuration(): string {
    const hours = Number(this.form.controls.overtime_hours.value || 0);
    const minutes = Number(this.form.controls.overtime_minutes.value || 0);
    return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  }

  private get isSundayDate(): boolean {
    const value = this.form.controls.work_date.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    return date.getFullYear() === year && date.getMonth() === month - 1 &&
      date.getDate() === day && date.getDay() === 0;
  }

  get saveDisabled(): boolean {
    if (this.saving || this.loadingEmployees || this.loadingProjects || this.form.invalid) return true;
    const { employee_id, project_id, overtime_hours, overtime_minutes, worked_until } = this.form.getRawValue();
    if (!Number.isSafeInteger(Number(employee_id)) || Number(employee_id) < 1 ||
        !Number.isSafeInteger(Number(project_id)) || Number(project_id) < 1) return true;
    if (this.isOvertime) {
      const hours = Number(overtime_hours);
      const minutes = Number(overtime_minutes);
      const totalMinutes = hours * 60 + minutes;
      return !Number.isInteger(hours) || !Number.isInteger(minutes) ||
        minutes < 0 || minutes > 59 || totalMinutes <= 0 || totalMinutes > 1440;
    }
    if (!this.isSundayDate || !/^\d{2}:\d{2}$/.test(worked_until)) return true;
    const [h, m] = worked_until.split(':').map(Number);
    return h < 0 || h > 23 || m < 0 || m > 59;
  }

  ngOnInit(): void {
    this.loadProjects();
    this.form.controls.work_date.valueChanges.pipe(
      startWith(this.form.controls.work_date.value),
      distinctUntilChanged(),
      switchMap((workDate) => {
        this.employees = [];
        this.employeeOptions = [];
        this.form.controls.employee_id.setValue(0);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return of([] as EmployeeAttendanceCatalogRow[]);
        this.loadingEmployees = true;
        return this.attendanceApi.getAttendanceEmployees(workDate).pipe(
          catchError((error) => {
            console.error('No se pudieron cargar empleados para la fecha', error);
            this.snackBar.open('No se pudieron cargar los empleados para esa fecha.', 'Cerrar', { duration: 6000 });
            return of([] as EmployeeAttendanceCatalogRow[]);
          }),
          finalize(() => { this.loadingEmployees = false; }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((employees) => {
      this.employees = employees;
      this.employeeOptions = employees.map((employee) => ({ id: employee.id, name: employee.full_name }));
    });
  }

  private loadProjects(): void {
    this.loadingProjects = true;
    this.catalogsApi.projectsCatalog('').pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.loadingProjects = false; }),
    ).subscribe({
      next: (projects) => {
        this.projectOptions = projects.map((project) => ({ id: project.id, name: project.name }));
      },
      error: (error) => {
        console.error('No se pudieron cargar los proyectos', error);
        this.snackBar.open('No se pudieron cargar los proyectos.', 'Cerrar', { duration: 6000 });
      },
    });
  }

  onBtnsSectionAction(action: string): void {
    if (action === 'save') this.save();
    if (action === 'cancel') this.closeModal();
  }

  private save(): void {
    if (this.saveDisabled) return;
    const value = this.form.getRawValue();
    const base = {
      employee_id: Number(value.employee_id),
      project_id: Number(value.project_id),
      work_date: value.work_date,
    };
    const request: Observable<CreatedLabourOvertimeDto | CreatedLabourSundayDto> = this.isOvertime
      ? this.extraApi.createOvertime({
          ...base,
          overtime_hours: Number(value.overtime_hours),
          overtime_minutes: Number(value.overtime_minutes),
        } satisfies CreateLabourOvertimeDto)
      : this.extraApi.createSunday({
          ...base,
          worked_until: value.worked_until.trim(),
        } satisfies CreateLabourSundayDto);

    this.saving = true;
    request.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.saving = false; }),
    ).subscribe({
      next: () => {
        this.snackBar.open('Registro creado como pendiente.', 'Cerrar', { duration: 4000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error al registrar horas extra o domingo', error);
        const message = error?.error?.message;
        const detail = Array.isArray(message) ? message.join(' · ') :
          (typeof message === 'string' && message.trim() ? message : 'No se pudo registrar. Revisa los datos e intenta otra vez.');
        this.snackBar.open(detail, 'Cerrar', { duration: 8000 });
      },
    });
  }

  closeModal(): void {
    if (this.saving) return;
    this.dialogRef.close(null);
  }
}
