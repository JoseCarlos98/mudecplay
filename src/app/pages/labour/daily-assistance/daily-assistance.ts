import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import { MatIconModule } from '@angular/material/icon';

import { ModuleHeader } from '../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../shared/ui/module-header/interfaces/module-header-interface';
import { PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import { CatalogsService } from '../../../shared/services/catalogs.service';
import { InputField } from '../../../shared/ui/input-field/input-field';

import { DailyAssistanceService } from './services/daily-assistance.service';
import * as entity from './interfaces/daily-assistance-interfaces';

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
  daily_salary: number;
  isSelected: boolean;
};

type AttendanceCard = entity.EmployeeAttendanceRow & {
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
    MatIconModule,
    ModuleHeader,
    InputField,
  ],
  templateUrl: './daily-assistance.html',
  styleUrl: './daily-assistance.scss',
})
export class DailyAssistance implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dailyAssistanceService = inject(DailyAssistanceService);
  private readonly catalogsService = inject(CatalogsService);

  readonly headerConfig = HEADER_CONFIG;

  isLoading = false;
  isSaving = false;

  currentDate = this.getToday();
  currentView: entity.DailyAssistanceView = 'unassigned';

  employeeSearchTerm = '';
  projectSearchTerm = '';

  projectOptions: ProjectOption[] = [];

  employees: EmployeeCard[] = [];
  assignedAttendances: AttendanceCard[] = [];
  cancelledAttendances: AttendanceCard[] = [];

  selectedEmployeeIds = new Set<number>();
  selectedProjectId: number | null = null;

  editingAttendance: AttendanceCard | null = null;
  cancellingAttendance: AttendanceCard | null = null;

  cancellationReason = '';

  ngOnInit(): void {
    this.reloadBoard();
  }

  get selectedEmployees(): EmployeeCard[] {
    return this.employees.filter((employee) => this.selectedEmployeeIds.has(employee.id));
  }

  get selectedProject(): ProjectOption | null {
    return this.projectOptions.find((project) => project.id === this.selectedProjectId) ?? null;
  }

  get totalEmployeesCount(): number {
    return this.employees.length + this.assignedAttendances.length + this.cancelledAttendances.length;
  }

  get unassignedCount(): number {
    return this.employees.length;
  }

  get assignedCount(): number {
    return this.assignedAttendances.length;
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

  get displayAssignedAttendances(): AttendanceCard[] {
    return this.filterAttendances(this.assignedAttendances);
  }

  get displayCancelledAttendances(): AttendanceCard[] {
    return this.filterAttendances(this.cancelledAttendances);
  }

  get displayProjects(): ProjectOption[] {
    const term = this.normalizeText(this.projectSearchTerm);

    if (!term) return this.projectOptions;

    return this.projectOptions.filter((project) =>
      this.normalizeText(project.name).includes(term),
    );
  }

  get totalSelectedDailySalary(): number {
    return this.selectedEmployees.reduce(
      (sum, employee) => sum + Number(employee.daily_salary ?? 0),
      0,
    );
  }

  get employeeSearchLabel(): string {
    switch (this.currentView) {
      case 'assigned':
        return 'Buscar asignado';
      case 'cancelled':
        return 'Buscar cancelado';
      default:
        return 'Buscar trabajador';
    }
  }

  changeView(view: entity.DailyAssistanceView): void {
    if (this.currentView === view) return;

    this.currentView = view;
    this.resetActionState();
  }

  toggleEmployeeSelection(employeeId: number): void {
    if (this.selectedEmployeeIds.has(employeeId)) {
      this.selectedEmployeeIds.delete(employeeId);
    } else {
      this.selectedEmployeeIds.add(employeeId);
    }

    this.syncEmployeeSelection();
    this.editingAttendance = null;
    this.cancellingAttendance = null;
  }

  selectProject(projectId: number): void {
    this.selectedProjectId = projectId;
  }

  startReassign(attendance: AttendanceCard): void {
    this.editingAttendance = attendance;
    this.cancellingAttendance = null;
    this.selectedEmployeeIds.clear();
    this.selectedProjectId = attendance.project_id;
    this.syncEmployeeSelection();
  }

  startCancel(attendance: AttendanceCard): void {
    this.cancellingAttendance = attendance;
    this.editingAttendance = null;
    this.selectedEmployeeIds.clear();
    this.selectedProjectId = null;
    this.cancellationReason = '';
    this.syncEmployeeSelection();
  }

  clearActionPanel(): void {
    this.resetActionState();
  }

  assignSelected(): void {
    if (!this.currentDate || !this.selectedProjectId || this.selectedEmployeeIds.size === 0 || this.isSaving) {
      return;
    }

    const requests = Array.from(this.selectedEmployeeIds).map((employeeId) =>
      this.dailyAssistanceService.create({
        employee_id: employeeId,
        project_id: Number(this.selectedProjectId),
        work_date: this.currentDate,
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
          console.error('Error asignando asistencias:', err);
        },
      });
  }

  applyReassign(): void {
    if (!this.editingAttendance || !this.selectedProjectId || this.isSaving) {
      return;
    }

    this.isSaving = true;

    this.dailyAssistanceService
      .update(this.editingAttendance.id, {
        project_id: Number(this.selectedProjectId),
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
          console.error('Error actualizando proyecto de asistencia:', err);
        },
      });
  }

  confirmCancel(): void {
    if (!this.cancellingAttendance || !this.cancellationReason.trim() || this.isSaving) {
      return;
    }

    this.isSaving = true;

    this.dailyAssistanceService
      .cancel(this.cancellingAttendance.id, {
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
          console.error('Error cancelando asistencia:', err);
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

      employees: this.dailyAssistanceService.getAttendanceEmployees() as Observable<
        entity.EmployeeAttendanceCatalogRow[]
      >,

      projects: this.getProjectsCatalog(),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ attendances, employees, projects }) => {
          this.projectOptions = projects ?? [];
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

    const employeeMap = new Map<number, entity.EmployeeAttendanceCatalogRow>(
      allEmployees.map((employee) => [employee.id, employee]),
    );

    const attendanceEmployeeIds = new Set<number>(
      attendances.map((attendance) => attendance.employee_id),
    );

    this.assignedAttendances = attendances
      .filter((attendance) => attendance.status === 'assigned')
      .map((attendance) => this.mapAttendanceCard(attendance, employeeMap))
      .sort((a, b) => a.employee_full_name.localeCompare(b.employee_full_name));

    this.cancelledAttendances = attendances
      .filter((attendance) => attendance.status === 'cancelled')
      .map((attendance) => this.mapAttendanceCard(attendance, employeeMap))
      .sort((a, b) => a.employee_full_name.localeCompare(b.employee_full_name));

    this.employees = allEmployees
      .filter((employee) => !attendanceEmployeeIds.has(employee.id))
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
        daily_salary: Number(employee.weekly_salary ?? 0) / 7,
        isSelected: this.selectedEmployeeIds.has(employee.id),
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    this.syncEmployeeSelection();
  }

  private mapAttendanceCard(
    attendance: entity.EmployeeAttendanceRow,
    employeeMap: Map<number, entity.EmployeeAttendanceCatalogRow>,
  ): AttendanceCard {
    const employee = employeeMap.get(attendance.employee_id);

    return {
      ...attendance,
      employee_full_name:
        attendance.employee_name ??
        employee?.full_name ??
        'Empleado sin nombre',
      employee_area_label: employee?.employee_area_name ?? 'Sin área',
      employee_position: employee?.position ?? 'Sin puesto',
      employee_area_id: employee?.employee_area_id ?? null,
    };
  }

  private filterAttendances(rows: AttendanceCard[]): AttendanceCard[] {
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

  private resetActionState(): void {
    this.selectedEmployeeIds.clear();
    this.selectedProjectId = null;
    this.editingAttendance = null;
    this.cancellingAttendance = null;
    this.cancellationReason = '';
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
}