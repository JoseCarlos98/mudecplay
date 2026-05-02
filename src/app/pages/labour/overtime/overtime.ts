import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { ModuleHeader } from '../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../shared/ui/module-header/interfaces/module-header-interface';
import { InputDate } from '../../../shared/ui/input-date/input-date';
import { InputField } from '../../../shared/ui/input-field/input-field';
import { InputSelect, SelectCatalogOption } from '../../../shared/ui/input-select/input-select';
import { BtnsSection } from '../../../shared/ui/btns-section/btns-section';
import { DataTable } from '../../../shared/ui/data-table/data-table';
import { LoadingOverlay } from '../../../shared/ui/loading-overlay/loading-overlay';

import {
  ColumnsConfig,
  DataTableActionEvent,
  DataTableExtraAction,
  TableActionPermissions,
} from '../../../shared/ui/data-table/interfaces/table-interfaces';

type OvertimeTab = 'overtime' | 'sunday';
type RowStatus = 'pending' | 'authorized' | 'cancelled';

interface OvertimeRow {
  id: number;
  kind: OvertimeTab;
  employee_name: string;
  area_label: string;
  work_date: string;
  project_name: string;
  overtime_label?: string;
  worked_until?: string;
  extra_days_label?: string;
  amount: number;
  status: RowStatus;
  status_label: string;
  authorized_by: string | null;
}

interface TableResponse<T> {
  data: T[];
  meta: {
    total: number;
  };
}

const HEADER_CONFIG: ModuleHeaderConfig = {
  showNew: true,
};

@Component({
  selector: 'app-overtime',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatPaginatorModule,
    CurrencyPipe,

    ModuleHeader,
    InputDate,
    InputField,
    InputSelect,
    BtnsSection,
    DataTable,
    LoadingOverlay,
  ],
  templateUrl: './overtime.html',
  styleUrl: './overtime.scss',
})
export class Overtime implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly headerConfig = HEADER_CONFIG;
  readonly activeTab = signal<OvertimeTab>('overtime');
  readonly loadingTable = signal(false);

  filters = {
    page: 1,
    limit: 5,
  };

  formFilters = this.fb.nonNullable.group({
    workDate: ['2026-04-29'],
    employeeName: [''],
    area: [''],
    project: [''],
    status: [''],
  });

  readonly areaOptions: SelectCatalogOption[] = [
    { id: 'ELÉCTRICOS', name: 'ELÉCTRICOS' },
    { id: 'ARQUITECTOS', name: 'ARQUITECTOS' },
    { id: 'ADMINISTRATIVOS', name: 'ADMINISTRATIVOS' },
    { id: 'TÉCNICOS', name: 'TÉCNICOS' },
    { id: 'CHOFERES', name: 'CHOFERES' },
    { id: 'PLOMEROS', name: 'PLOMEROS' },
    { id: 'CARPINTEROS', name: 'CARPINTEROS' },
  ];

  readonly projectOptions: SelectCatalogOption[] = [
    { id: 'Residencial Los Álamos', name: 'Residencial Los Álamos' },
    { id: 'Plaza Cedros', name: 'Plaza Cedros' },
    { id: 'Torre Norte', name: 'Torre Norte' },
    { id: 'Bodega Industrial', name: 'Bodega Industrial' },
    { id: 'Parque Logístico', name: 'Parque Logístico' },
    { id: 'Villas del Sol', name: 'Villas del Sol' },
  ];

  readonly statusOptions: SelectCatalogOption[] = [
    { id: '', name: 'Todos' },
    { id: 'pending', name: 'Pendiente' },
    { id: 'authorized', name: 'Autorizada' },
    { id: 'cancelled', name: 'Cancelada' },
  ];

  readonly tableActionPermissions: TableActionPermissions = {
    showEdit: true,
    showDelete: true,
  };

  readonly extraActions: DataTableExtraAction<OvertimeRow>[] = [
    {
      type: 'authorize',
      icon: 'check_circle',
      tooltip: 'Autorizar',
      visible: (row) => row.status === 'pending',
    },
  ];

  readonly overtimeRowsSeed: OvertimeRow[] = [
    {
      id: 1,
      kind: 'overtime',
      employee_name: 'Vegeta',
      area_label: 'ELÉCTRICOS',
      work_date: '2026-04-29',
      project_name: 'Residencial Los Álamos',
      overtime_label: '1 h 30 min',
      amount: 535.71,
      status: 'pending',
      status_label: 'Pendiente',
      authorized_by: null,
    },
    {
      id: 2,
      kind: 'overtime',
      employee_name: 'Goku',
      area_label: 'ARQUITECTOS',
      work_date: '2026-04-29',
      project_name: 'Plaza Cedros',
      overtime_label: '2 h 00 min',
      amount: 714.28,
      status: 'authorized',
      status_label: 'Autorizada',
      authorized_by: 'JCUEVAS',
    },
    {
      id: 3,
      kind: 'overtime',
      employee_name: 'Bulma',
      area_label: 'ADMINISTRATIVOS',
      work_date: '2026-04-29',
      project_name: 'Torre Norte',
      overtime_label: '1 h 00 min',
      amount: 285.71,
      status: 'authorized',
      status_label: 'Autorizada',
      authorized_by: 'DCUEVAS',
    },
    {
      id: 4,
      kind: 'overtime',
      employee_name: 'Piccolo',
      area_label: 'TÉCNICOS',
      work_date: '2026-04-29',
      project_name: 'Bodega Industrial',
      overtime_label: '0 h 30 min',
      amount: 178.57,
      status: 'cancelled',
      status_label: 'Cancelada',
      authorized_by: 'HCUEVAS',
    },
    {
      id: 5,
      kind: 'overtime',
      employee_name: 'Trunks',
      area_label: 'CHOFERES',
      work_date: '2026-04-29',
      project_name: 'Parque Logístico',
      overtime_label: '3 h 00 min',
      amount: 892.86,
      status: 'pending',
      status_label: 'Pendiente',
      authorized_by: null,
    },
    {
      id: 6,
      kind: 'overtime',
      employee_name: 'Gohan',
      area_label: 'PLOMEROS',
      work_date: '2026-04-29',
      project_name: 'Villas del Sol',
      overtime_label: '1 h 30 min',
      amount: 421.43,
      status: 'authorized',
      status_label: 'Autorizada',
      authorized_by: 'JCUEVAS',
    },
  ];

  readonly sundayRowsSeed: OvertimeRow[] = [
    {
      id: 101,
      kind: 'sunday',
      employee_name: 'Roshi',
      area_label: 'CHOFERES',
      work_date: '2026-04-26',
      project_name: 'Residencial Los Álamos',
      worked_until: '13:30',
      extra_days_label: '1 día extra',
      amount: 410,
      status: 'pending',
      status_label: 'Pendiente',
      authorized_by: null,
    },
    {
      id: 102,
      kind: 'sunday',
      employee_name: 'Krillin',
      area_label: 'CARPINTEROS',
      work_date: '2026-04-26',
      project_name: 'Plaza Cedros',
      worked_until: '14:30',
      extra_days_label: '2 días extra',
      amount: 820,
      status: 'authorized',
      status_label: 'Autorizada',
      authorized_by: 'JCUEVAS',
    },
    {
      id: 103,
      kind: 'sunday',
      employee_name: 'Yamcha',
      area_label: 'TÉCNICOS',
      work_date: '2026-04-26',
      project_name: 'Bodega Industrial',
      worked_until: '12:00',
      extra_days_label: '1 día extra',
      amount: 390,
      status: 'cancelled',
      status_label: 'Cancelada',
      authorized_by: 'HCUEVAS',
    },
    {
      id: 104,
      kind: 'sunday',
      employee_name: 'Ten Shin Han',
      area_label: 'ELÉCTRICOS',
      work_date: '2026-04-26',
      project_name: 'Torre Norte',
      worked_until: '16:00',
      extra_days_label: '2 días extra',
      amount: 930,
      status: 'authorized',
      status_label: 'Autorizada',
      authorized_by: 'DCUEVAS',
    },
  ];

  overtimeRows: OvertimeRow[] = [...this.overtimeRowsSeed];
  sundayRows: OvertimeRow[] = [...this.sundayRowsSeed];

  overtimeTableData!: TableResponse<OvertimeRow>;

  displayedColumns: string[] = [];
  columnsConfig: ColumnsConfig[] = [];

  readonly currentTitle = computed(() =>
    this.activeTab() === 'overtime' ? 'Horas extra' : 'Domingo trabajado',
  );

  readonly filteredRows = computed(() => {
    const raw = this.formFilters.getRawValue();
    const employeeName = raw.employeeName.trim().toLowerCase();
    const source = this.activeTab() === 'overtime' ? this.overtimeRows : this.sundayRows;

    return source.filter((row) => {
      const matchDate = !raw.workDate || row.work_date === raw.workDate;
      const matchEmployee =
        !employeeName || row.employee_name.toLowerCase().includes(employeeName);
      const matchArea = !raw.area || row.area_label === raw.area;
      const matchProject = !raw.project || row.project_name === raw.project;
      const matchStatus = !raw.status || row.status === raw.status;

      return matchDate && matchEmployee && matchArea && matchProject && matchStatus;
    });
  });

  readonly pendingCount = computed(
    () => this.filteredRows().filter((row) => row.status === 'pending').length,
  );

  readonly authorizedCount = computed(
    () => this.filteredRows().filter((row) => row.status === 'authorized').length,
  );

  readonly totalAmount = computed(() =>
    this.filteredRows().reduce((acc, row) => acc + row.amount, 0),
  );

  readonly totalRegisteredLabel = computed(() => {
    if (this.activeTab() === 'overtime') {
      const totalMinutes = this.filteredRows().reduce((acc, row) => {
        if (!row.overtime_label) return acc;

        const match = row.overtime_label.match(/(\d+)\s*h\s*(\d+)\s*min/i);
        if (!match) return acc;

        return acc + Number(match[1]) * 60 + Number(match[2]);
      }, 0);

      return `${(totalMinutes / 60).toFixed(1)} h`;
    }

    return `${this.filteredRows().length}`;
  });

  ngOnInit(): void {
    this.setTableConfig();
    this.refreshTable();
  }

  get hasActiveFilters(): boolean {
    const raw = this.formFilters.getRawValue();
    const defaultDate = this.activeTab() === 'overtime' ? '2026-04-29' : '2026-04-26';

    return !!(
      raw.employeeName.trim() ||
      raw.area ||
      raw.project ||
      raw.status ||
      raw.workDate !== defaultDate
    );
  }

  setActiveTab(tab: OvertimeTab): void {
    if (this.activeTab() === tab) return;

    this.activeTab.set(tab);
    this.filters.page = 1;

    this.formFilters.patchValue({
      workDate: tab === 'overtime' ? '2026-04-29' : '2026-04-26',
      employeeName: '',
      area: '',
      project: '',
      status: '',
    });

    this.setTableConfig();
    this.refreshTable();
  }

  onHeaderAction(action: string): void {
    if (action === 'new') {
      console.log(
        this.activeTab() === 'overtime'
          ? 'Abrir modal de registrar horas extra'
          : 'Abrir modal de registrar domingo trabajado',
      );
    }
  }

  onBtnsSectionAction(action: string): void {
    switch (action) {
      case 'search':
        this.filters.page = 1;
        this.refreshTable();
        break;

      case 'clean':
        this.clearFilters();
        break;
    }
  }

  clearFilters(): void {
    this.formFilters.reset({
      workDate: this.activeTab() === 'overtime' ? '2026-04-29' : '2026-04-26',
      employeeName: '',
      area: '',
      project: '',
      status: '',
    });

    this.filters.page = 1;
    this.refreshTable();
  }

  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;
    this.refreshTable();
  }

  onTableAction(event: DataTableActionEvent<OvertimeRow>): void {
    const targetCollection = this.activeTab() === 'overtime' ? this.overtimeRows : this.sundayRows;
    const target = targetCollection.find((row) => row.id === event.row.id);

    if (!target) return;

    switch (event.type) {
      case 'authorize':
        target.status = 'authorized';
        target.status_label = 'Autorizada';
        target.authorized_by = 'JCUEVAS';
        break;

      case 'delete':
        target.status = 'cancelled';
        target.status_label = 'Cancelada';
        target.authorized_by = target.authorized_by || 'HCUEVAS';
        break;

      case 'edit':
        console.log('Editar registro', target);
        break;
    }

    this.refreshTable();
  }

  private setTableConfig(): void {
    if (this.activeTab() === 'overtime') {
      this.displayedColumns = [
        'employee_name',
        'area_label',
        'work_date',
        'project_name',
        'overtime_label',
        'amount',
        'status_label',
        'authorized_by',
        'actions',
      ];

      this.columnsConfig = [
        { key: 'employee_name', label: 'Empleado' },
        { key: 'area_label', label: 'Área', type: 'chip', typeVariant: 'chip-neutral' },
        { key: 'work_date', label: 'Fecha', type: 'date' },
        { key: 'project_name', label: 'Proyecto' },
        { key: 'overtime_label', label: 'Horas extra' },
        { key: 'amount', label: 'Importe', type: 'money', align: 'right' },
        { key: 'status_label', label: 'Estatus' },
        { key: 'authorized_by', label: 'Autorizó', fallback: '—' },
      ];
    } else {
      this.displayedColumns = [
        'employee_name',
        'area_label',
        'work_date',
        'project_name',
        'worked_until',
        'extra_days_label',
        'amount',
        'status_label',
        'authorized_by',
        'actions',
      ];

      this.columnsConfig = [
        { key: 'employee_name', label: 'Empleado' },
        { key: 'area_label', label: 'Área', type: 'chip', typeVariant: 'chip-neutral' },
        { key: 'work_date', label: 'Fecha', type: 'date' },
        { key: 'project_name', label: 'Proyecto' },
        { key: 'worked_until', label: 'Trabajó hasta' },
        { key: 'extra_days_label', label: 'Días extra' },
        { key: 'amount', label: 'Importe', type: 'money', align: 'right' },
        { key: 'status_label', label: 'Estatus' },
        { key: 'authorized_by', label: 'Autorizó', fallback: '—' },
      ];
    }
  }

  private refreshTable(): void {
    const rows = [...this.filteredRows()];
    const start = (this.filters.page - 1) * this.filters.limit;
    const end = start + this.filters.limit;

    this.overtimeTableData = {
      data: rows.slice(start, end),
      meta: {
        total: rows.length,
      },
    };
  }
}