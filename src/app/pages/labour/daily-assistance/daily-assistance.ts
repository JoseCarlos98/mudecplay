import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

import { MatIconModule } from '@angular/material/icon';

import { ModuleHeader } from '../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../shared/ui/module-header/interfaces/module-header-interface';
import { PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import { CatalogsService } from '../../../shared/services/catalogs.service';
import { InputField } from '../../../shared/ui/input-field/input-field';
import { InputDate } from '../../../shared/ui/input-date/input-date';
import { BtnsSection } from '../../../shared/ui/btns-section/btns-section';

import { DailyAssistanceService } from './services/daily-assistance.service';
import * as entity from './interfaces/daily-assistance-interfaces';
import { MatTooltip } from "@angular/material/tooltip";
import { ModalSunday, ModalSundayData, ModalSundayResult } from './components/modal-sunday/modal-sunday';
import { DialogService } from '../../../shared/services/dialog.service';

const HEADER_CONFIG: ModuleHeaderConfig = {};

type ProjectOption = {
  id: number;
  name: string;
};

type EmployeeCard = entity.EmployeeAttendanceCatalogRow & {
  curp: string;
  address: string | null;
  birth_date: string | null;
  age: number | null;
  entry_date: string | null;
  discharge_date: string | null;
  reentry_date: string | null;
  photoUrl: string | null;
  position: string;
  area_label: string;
  isSelected: boolean;
};

type AssignmentCard = entity.EmployeeAttendanceAssignmentRow & {
  employee_id: number;
  employee_full_name: string;
  employee_area_label: string;
  employee_position: string;
  employee_area_id: number | null;

  work_date: string;
  attendance_status: entity.EmployeeAttendanceStatus;
  attendance_available_hours: number;
  attendance_total_daily_hours: number;

  daily_salary_snapshot: number;
};

type AbsenceCard = entity.EmployeeAttendanceRow & {
  employee_full_name: string;
  employee_area_label: string;
  employee_position: string;
  employee_area_id: number | null;
};

@Component({
  selector: 'app-daily-assistance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    ModuleHeader,
    InputField,
    InputDate,
    BtnsSection,
    MatTooltip
  ],
  templateUrl: './daily-assistance.html',
  styleUrl: './daily-assistance.scss',
})
export class DailyAssistance implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly dailyAssistanceService = inject(DailyAssistanceService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly dialogService = inject(DialogService);
  readonly headerConfig = HEADER_CONFIG;

  isLoading = false;
  isSaving = false;

  currentDate = this.getToday();
  currentView: entity.DailyAssistanceView = 'unassigned';

  formFilters = this.fb.group({
    workDate: this.fb.control<string | null>(this.getToday()),
  });

  employeeSearchTerm = '';
  projectSearchTerm = '';

  projectOptions: ProjectOption[] = [];

  totalEmployeesFromCatalog = 0;

  employees: EmployeeCard[] = [];
  assignedAttendances: AssignmentCard[] = [];
  absentAttendances: AbsenceCard[] = [];
  cancelledAttendances: AssignmentCard[] = [];

  selectedEmployeeIds = new Set<number>();
  selectedProjectId: number | null = null;

  assignmentHours: number | null = this.getDefaultAssignmentHours();

  editingAttendance: AssignmentCard | null = null;
  editingHours: number | null = null;

  cancellingAttendance: AssignmentCard | null = null;

  absenceEmployee: EmployeeCard | null = null;

  cancellationReason = '';
  absenceReason = '';

  sundayGenerationStatus: entity.SundayGenerationStatusResponse | null = null;
  isGeneratingSunday = false;

  ngOnInit(): void {
    this.searchWithFilters();
  }


  get showSundayGenerationCard(): boolean {
    return !!this.sundayGenerationStatus?.is_sunday;
  }

  get sundayGenerationSourceText(): string {
    const status = this.sundayGenerationStatus;

    if (!status?.source_date || !status.source_type) return '';

    const label = status.source_type === 'saturday' ? 'sábado' : 'viernes';

    return `Fuente: ${label} ${status.source_date} · ${status.source_assignments_count} asignación(es)`;
  }

  get selectedEmployees(): EmployeeCard[] {
    return this.employees.filter((employee) => this.selectedEmployeeIds.has(employee.id));
  }

  get selectedProject(): ProjectOption | null {
    return this.projectOptions.find((project) => project.id === this.selectedProjectId) ?? null;
  }

  get totalEmployeesCount(): number {
    return this.totalEmployeesFromCatalog;
  }

  get unassignedCount(): number {
    return this.employees.length;
  }

  get assignedCount(): number {
    return this.assignedAttendances.length;
  }

  get absentCount(): number {
    return this.absentAttendances.length;
  }

  get cancelledCount(): number {
    return this.cancelledAttendances.length;
  }

  get hasEmployeeSearch(): boolean {
    return !!this.employeeSearchTerm.trim();
  }

  get hasProjectSearch(): boolean {
    return !!this.projectSearchTerm.trim();
  }

  get hasActiveFilters(): boolean {
    const value = this.formFilters.getRawValue();
    const today = this.getToday();

    return (value.workDate ?? today) !== today;
  }

  get displayEmployees(): EmployeeCard[] {
    const term = this.normalizeText(this.employeeSearchTerm);

    if (!term) return this.employees;

    return this.employees.filter((employee) => {
      const haystack = [
        employee.full_name,
        employee.position,
        employee.area_label,
      ]
        .map((value) => this.normalizeText(value))
        .join(' ');

      return haystack.includes(term);
    });
  }

  get displayAssignedAttendances(): AssignmentCard[] {
    return this.filterAssignments(this.assignedAttendances);
  }

  get displayAbsentAttendances(): AbsenceCard[] {
    return this.filterAbsences(this.absentAttendances);
  }

  get displayCancelledAttendances(): AssignmentCard[] {
    return this.filterAssignments(this.cancelledAttendances);
  }

  get displayProjects(): ProjectOption[] {
    const term = this.normalizeText(this.projectSearchTerm);

    if (!term) return this.projectOptions;

    return this.projectOptions.filter((project) =>
      this.normalizeText(project.name).includes(term),
    );
  }

  get selectedMinAvailableHours(): number {
    if (!this.selectedEmployees.length) return 0;

    return Math.min(
      ...this.selectedEmployees.map((employee) => Number(employee.available_hours ?? 0)),
    );
  }

  get assignmentInputMax(): number {
    if (this.selectedEmployees.length) {
      return this.selectedMinAvailableHours;
    }

    return this.getDefaultAssignmentHours();
  }

  get assignmentHoursHelperText(): string {
    if (this.selectedEmployees.length) {
      return `${this.selectedMinAvailableHours} hrs`;
    }

    return `${this.getDefaultAssignmentHours()} hrs`;
  }

  get normalizedAssignmentHours(): number {
    return Number(this.assignmentHours ?? 0);
  }

  get canAssignSelected(): boolean {
    const hours = this.normalizedAssignmentHours;

    return (
      this.selectedEmployees.length > 0 &&
      !!this.selectedProjectId &&
      hours > 0 &&
      hours <= this.selectedMinAvailableHours &&
      !this.isSaving
    );
  }

  get estimatedSelectedAmount(): number {
    const hours = this.normalizedAssignmentHours;

    if (hours <= 0) return 0;

    return this.selectedEmployees.reduce(
      (sum, employee) => sum + Number(employee.hourly_salary ?? 0) * hours,
      0,
    );
  }

  get maxEditingHours(): number {
    if (!this.editingAttendance) return 0;

    return Number(
      (
        Number(this.editingAttendance.attendance_available_hours ?? 0) +
        Number(this.editingAttendance.assigned_hours ?? 0)
      ).toFixed(2),
    );
  }

  get canApplyReassign(): boolean {
    const hours = Number(this.editingHours ?? 0);

    return (
      !!this.editingAttendance &&
      !!this.selectedProjectId &&
      hours > 0 &&
      hours <= this.maxEditingHours &&
      !this.isSaving
    );
  }

  get employeeSearchLabel(): string {
    switch (this.currentView) {
      case 'assigned':
        return 'Buscar asignado';
      case 'absent':
        return 'Buscar falta';
      case 'cancelled':
        return 'Buscar cancelado';
      default:
        return 'Buscar trabajador';
    }
  }

  searchWithFilters(): void {
    const value = this.formFilters.getRawValue();

    this.currentDate = value.workDate ?? this.getToday();
    this.resetActionState();
    this.reloadBoard();
  }

  clearFilters(): void {
    const today = this.getToday();

    this.formFilters.reset(
      {
        workDate: today,
      },
      { emitEvent: false },
    );

    this.currentDate = today;
    this.resetActionState();
    this.reloadBoard();
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'search':
        this.searchWithFilters();
        break;

      case 'clean':
        this.clearFilters();
        break;
    }
  }

  changeView(view: entity.DailyAssistanceView): void {
    if (this.currentView === view) return;

    this.currentView = view;
    this.resetActionState();
  }

  toggleEmployeeSelection(employeeId: number): void {
    const employee = this.employees.find((row) => row.id === employeeId);

    if (!employee?.can_assign) return;

    if (this.selectedEmployeeIds.has(employeeId)) {
      this.selectedEmployeeIds.delete(employeeId);
    } else {
      this.selectedEmployeeIds.add(employeeId);
    }

    this.syncEmployeeSelection();
    this.syncAssignmentHoursWithSelection();

    this.editingAttendance = null;
    this.cancellingAttendance = null;
    this.absenceEmployee = null;
  }

  selectProject(projectId: number): void {
    this.selectedProjectId = projectId;
  }

  startReassign(attendance: AssignmentCard): void {
    this.editingAttendance = attendance;
    this.editingHours = Number(attendance.assigned_hours ?? 0);
    this.cancellingAttendance = null;
    this.absenceEmployee = null;
    this.selectedEmployeeIds.clear();
    this.selectedProjectId = attendance.project_id;
    this.cancellationReason = '';
    this.absenceReason = '';
    this.syncEmployeeSelection();
  }

  startCancel(attendance: AssignmentCard): void {
    this.cancellingAttendance = attendance;
    this.editingAttendance = null;
    this.absenceEmployee = null;
    this.selectedEmployeeIds.clear();
    this.selectedProjectId = null;
    this.cancellationReason = '';
    this.absenceReason = '';
    this.syncEmployeeSelection();
  }

  startAbsence(employee: EmployeeCard, event?: Event): void {
    event?.stopPropagation();

    if (!employee.can_mark_absent || this.isSaving) return;

    this.absenceEmployee = employee;
    this.editingAttendance = null;
    this.cancellingAttendance = null;
    this.selectedEmployeeIds.clear();
    this.selectedProjectId = null;
    this.cancellationReason = '';
    this.absenceReason = 'No asistió';
    this.syncEmployeeSelection();
  }

  clearActionPanel(): void {
    this.resetActionState();
  }

  assignSelected(): void {
    if (!this.currentDate || !this.canAssignSelected) {
      return;
    }

    const assignedHours = Number(this.assignmentHours ?? 0);

    const requests = this.selectedEmployees.map((employee) =>
      this.dailyAssistanceService.create({
        employee_id: employee.id,
        project_id: Number(this.selectedProjectId),
        work_date: this.currentDate,
        assigned_hours: assignedHours,
      }),
    );

    this.isSaving = true;

    forkJoin(requests)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.resetActionState();
          this.reloadBoard();
        },
        error: (err) => {
          console.error('Error asignando horas:', err);
        },
      });
  }

  applyReassign(): void {
    if (!this.canApplyReassign || !this.editingAttendance) {
      return;
    }

    this.isSaving = true;

    this.dailyAssistanceService
      .updateAssignment(this.editingAttendance.id, {
        project_id: Number(this.selectedProjectId),
        assigned_hours: Number(this.editingHours),
      })
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.resetActionState();
          this.reloadBoard();
        },
        error: (err) => {
          console.error('Error actualizando asignación:', err);
        },
      });
  }

  confirmCancel(): void {
    if (!this.cancellingAttendance || !this.cancellationReason.trim() || this.isSaving) {
      return;
    }

    this.isSaving = true;

    this.dailyAssistanceService
      .cancelAssignment(this.cancellingAttendance.id, {
        cancellation_reason: this.cancellationReason.trim(),
      })
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.resetActionState();
          this.reloadBoard();
        },
        error: (err) => {
          console.error('Error cancelando asignación:', err);
        },
      });
  }

  confirmAbsence(): void {
    if (!this.absenceEmployee || !this.absenceReason.trim() || this.isSaving || !this.currentDate) {
      return;
    }

    this.isSaving = true;

    this.dailyAssistanceService
      .markAbsence({
        employee_id: this.absenceEmployee.id,
        work_date: this.currentDate,
        absence_reason: this.absenceReason.trim(),
      })
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.resetActionState();
          this.reloadBoard();
        },
        error: (err) => {
          console.error('Error registrando falta:', err);
        },
      });
  }

  generateSundayAttendance(): void {
    const status = this.sundayGenerationStatus;

    if (
      !this.currentDate ||
      !status?.can_generate ||
      this.isGeneratingSunday ||
      this.isSaving
    ) {
      return;
    }

    const modalData: ModalSundayData = {
      work_date: status.work_date,
      source_date: status.source_date,
      source_type: status.source_type,
      source_assignments_count: status.source_assignments_count,
      message: status.message,
    };

    this.dialogService
      .open(ModalSunday, modalData, 'mini')
      .afterClosed()
      .subscribe((result: ModalSundayResult | null) => {
        if (!result || result.action !== 'confirmed') return;

        this.confirmGenerateSundayAttendance();
      });
  }

  private confirmGenerateSundayAttendance(): void {
    if (
      !this.currentDate ||
      !this.sundayGenerationStatus?.can_generate ||
      this.isGeneratingSunday ||
      this.isSaving
    ) {
      return;
    }

    this.isGeneratingSunday = true;

    this.dailyAssistanceService
      .generateSundayAttendance(this.currentDate)
      .pipe(
        finalize(() => {
          this.isGeneratingSunday = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.resetActionState();
          this.reloadBoard();
        },
        error: (err) => {
          console.error('Error generando domingo automático:', err);
        },
      });
  }

  private reloadBoard(): void {
    this.isLoading = true;

    forkJoin({
      attendances: this.dailyAssistanceService.getAttendances({
        work_date: this.currentDate,
        status: null,
        employee_id: null,
        project_id: null,
        page: 1,
        limit: 500,
      }) as Observable<PaginatedResponse<entity.EmployeeAttendanceRow>>,

      employees: this.dailyAssistanceService.getAttendanceEmployees(this.currentDate) as Observable<
        entity.EmployeeAttendanceCatalogRow[]
      >,

      projects: this.getProjectsCatalog(),

      sundayStatus: this.dailyAssistanceService
        .getSundayGenerationStatus(this.currentDate)
        .pipe(
          catchError((err) => {
            console.error('Error consultando estado de domingo automático:', err);
            return of(null);
          }),
        ),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ attendances, employees, projects, sundayStatus }) => {
          this.projectOptions = projects ?? [];
          this.sundayGenerationStatus = sundayStatus;
          this.buildBoardState(attendances, employees);
        },
        error: (err) => {
          console.error('Error cargando pantalla de asistencia diaria:', err);
        },
      });
  }

  private buildBoardState(
    attendancesResponse: PaginatedResponse<entity.EmployeeAttendanceRow>,
    employeesResponse: entity.EmployeeAttendanceCatalogRow[],
  ): void {
    const attendances = attendancesResponse.data ?? [];
    const allEmployees = employeesResponse ?? [];

    this.totalEmployeesFromCatalog = allEmployees.length;

    const employeeMap = new Map<number, entity.EmployeeAttendanceCatalogRow>(
      allEmployees.map((employee) => [employee.id, employee]),
    );

    this.assignedAttendances = attendances
      .flatMap((attendance) =>
        (attendance.assignments ?? [])
          .filter((assignment) => assignment.status === 'active')
          .map((assignment) => this.mapAssignmentCard(attendance, assignment, employeeMap)),
      )
      .sort((a, b) => a.employee_full_name.localeCompare(b.employee_full_name));

    this.cancelledAttendances = attendances
      .flatMap((attendance) =>
        (attendance.assignments ?? [])
          .filter((assignment) => assignment.status === 'cancelled')
          .map((assignment) => this.mapAssignmentCard(attendance, assignment, employeeMap)),
      )
      .sort((a, b) => a.employee_full_name.localeCompare(b.employee_full_name));

    this.absentAttendances = attendances
      .filter((attendance) => attendance.status === 'absent')
      .map((attendance) => this.mapAbsenceCard(attendance, employeeMap))
      .sort((a, b) => a.employee_full_name.localeCompare(b.employee_full_name));

    this.employees = allEmployees
      .filter((employee) => employee.can_assign)
      .map((employee): EmployeeCard => ({
        ...employee,
        curp: '',
        address: null,
        birth_date: null,
        age: null,
        entry_date: null,
        discharge_date: null,
        reentry_date: null,
        photoUrl: null,
        position: employee.position ?? 'Sin puesto',
        area_label: employee.employee_area_name ?? 'Sin área',
        isSelected: this.selectedEmployeeIds.has(employee.id),
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    this.syncEmployeeSelection();
  }

  private mapAssignmentCard(
    attendance: entity.EmployeeAttendanceRow,
    assignment: entity.EmployeeAttendanceAssignmentRow,
    employeeMap: Map<number, entity.EmployeeAttendanceCatalogRow>,
  ): AssignmentCard {
    const employee = employeeMap.get(attendance.employee_id);

    return {
      ...assignment,
      employee_id: attendance.employee_id,
      employee_full_name:
        attendance.employee_name ??
        employee?.full_name ??
        'Empleado sin nombre',
      employee_area_label:
        attendance.employee_area_name ??
        employee?.employee_area_name ??
        'Sin área',
      employee_position: employee?.position ?? 'Sin puesto',
      employee_area_id:
        attendance.employee_area_id ??
        employee?.employee_area_id ??
        null,
      work_date: attendance.work_date,
      attendance_status: attendance.status,
      attendance_available_hours: Number(attendance.available_hours ?? 0),
      attendance_total_daily_hours: Number(
        attendance.total_daily_hours ?? this.getDefaultAssignmentHours(attendance.work_date),
      ),
      daily_salary_snapshot: Number(attendance.daily_salary_snapshot ?? 0),
    };
  }

  private mapAbsenceCard(
    attendance: entity.EmployeeAttendanceRow,
    employeeMap: Map<number, entity.EmployeeAttendanceCatalogRow>,
  ): AbsenceCard {
    const employee = employeeMap.get(attendance.employee_id);

    return {
      ...attendance,
      employee_full_name:
        attendance.employee_name ??
        employee?.full_name ??
        'Empleado sin nombre',
      employee_area_label:
        attendance.employee_area_name ??
        employee?.employee_area_name ??
        'Sin área',
      employee_position: employee?.position ?? 'Sin puesto',
      employee_area_id:
        attendance.employee_area_id ??
        employee?.employee_area_id ??
        null,
    };
  }

  private filterAssignments(rows: AssignmentCard[]): AssignmentCard[] {
    const term = this.normalizeText(this.employeeSearchTerm);

    if (!term) return rows;

    return rows.filter((row) => {
      const haystack = [
        row.employee_full_name,
        row.employee_area_label,
        row.employee_position,
        row.project_name ?? '',
        row.cancellation_reason ?? '',
      ]
        .map((value) => this.normalizeText(value))
        .join(' ');

      return haystack.includes(term);
    });
  }

  private filterAbsences(rows: AbsenceCard[]): AbsenceCard[] {
    const term = this.normalizeText(this.employeeSearchTerm);

    if (!term) return rows;

    return rows.filter((row) => {
      const haystack = [
        row.employee_full_name,
        row.employee_area_label,
        row.employee_position,
        row.absence_reason ?? '',
      ]
        .map((value) => this.normalizeText(value))
        .join(' ');

      return haystack.includes(term);
    });
  }

  private resetActionState(): void {
    this.selectedEmployeeIds.clear();
    this.selectedProjectId = null;

    this.assignmentHours = this.getDefaultAssignmentHours();

    this.editingAttendance = null;
    this.editingHours = null;

    this.cancellingAttendance = null;
    this.absenceEmployee = null;

    this.cancellationReason = '';
    this.absenceReason = '';

    this.syncEmployeeSelection();
  }

  private syncEmployeeSelection(): void {
    this.employees = this.employees.map((employee) => ({
      ...employee,
      isSelected: this.selectedEmployeeIds.has(employee.id),
    }));
  }

  private getProjectsCatalog(): Observable<ProjectOption[]> {
    return this.catalogsService
      .projectsCatalog('', { statusProject: 'open' })
      .pipe(
        map((rows: any[]) =>
          (rows ?? []).map((row) => ({
            id: Number(row.id),
            name: String(row.name ?? ''),
          })),
        ),
      );
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getDefaultAssignmentHours(dateValue = this.currentDate): number {
    return this.isSaturday(dateValue) ? 6 : 9;
  }

  private isSaturday(dateValue: string | null | undefined): boolean {
    if (!dateValue) return false;

    const date = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date.getDay() === 6;
  }

  private syncAssignmentHoursWithSelection(): void {
    const maxHours = this.assignmentInputMax;

    if (!maxHours || maxHours <= 0) {
      this.assignmentHours = this.getDefaultAssignmentHours();
      return;
    }

    const currentHours = Number(this.assignmentHours ?? 0);

    if (!currentHours || currentHours <= 0 || currentHours > maxHours) {
      this.assignmentHours = maxHours;
    }
  }

  formatWorkDate(dateValue: string | null | undefined): string {
    if (!dateValue) return 'Sin fecha';

    const [year, month, day] = String(dateValue).split('-');

    if (!year || !month || !day) {
      return String(dateValue);
    }

    return `${day}/${month}/${year}`;
  }
}