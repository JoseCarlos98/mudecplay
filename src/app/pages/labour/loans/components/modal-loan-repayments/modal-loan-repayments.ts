import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize, Subscription, take } from 'rxjs';

import { ModuleHeader } from '../../../../../shared/ui/module-header/module-header';
import { ModuleHeaderConfig } from '../../../../../shared/ui/module-header/interfaces/module-header-interface';
import { BtnsSection } from '../../../../../shared/ui/btns-section/btns-section';
import { DateRangeValue, InputDate } from '../../../../../shared/ui/input-date/input-date';
import { InputSelect, SelectCatalogOption } from '../../../../../shared/ui/input-select/input-select';
import { InputField } from '../../../../../shared/ui/input-field/input-field';
import { LoadingOverlay } from '../../../../../shared/ui/loading-overlay/loading-overlay';
import { DataTable } from '../../../../../shared/ui/data-table/data-table';
import {
  ColumnsConfig,
  ColumnVariant,
  DataTableActionEvent,
  DataTableExtraAction,
  DataTableSortEvent,
  TableActionPermissions,
} from '../../../../../shared/ui/data-table/interfaces/table-interfaces';

import { LoansService } from '../../services/loans.service';
import {
  EmployeeLoanDto,
  FinanceSortItem,
  LoanRepaymentDto,
  LoanStatus,
  RepaymentSource,
  RepaymentStatus,
  RepaymentsFilters,
  RepaymentsSummary,
} from '../../interfaces/loans-interfaces';

interface RepaymentRow extends LoanRepaymentDto {
  amount_value: number;
  status_label: string;
  source_label: string;
}

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY_SUMMARY: RepaymentsSummary = {
  applied_count: 0,
  reversed_count: 0,
  applied_amount_total: 0,
};

@Component({
  selector: 'app-modal-loan-repayments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatPaginatorModule,
    ModuleHeader,
    BtnsSection,
    InputDate,
    InputSelect,
    InputField,
    LoadingOverlay,
    DataTable,
  ],
  templateUrl: './modal-loan-repayments.html',
  styleUrl: './modal-loan-repayments.scss',
})
export class ModalLoanRepayments implements OnInit {
  readonly data = inject<{ loan: EmployeeLoanDto }>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ModalLoanRepayments>);
  private readonly loans = inject(LoansService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private listSubscription?: Subscription;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly summary = signal<RepaymentsSummary>({ ...EMPTY_SUMMARY });
  readonly currentBalance = signal(Number(this.data.loan.remaining_balance ?? 0));
  readonly currentStatus = signal<LoanStatus>(this.data.loan.status);

  // El mismo componente muestra el formulario ÚNICAMENTE al pulsar "Nuevo".
  // No se crean otros modales ni carpetas en este paso.
  readonly showingNewRepayment = signal(false);
  reversingRepaymentId: string | null = null;

  readonly headerConfig = computed<ModuleHeaderConfig>(() => ({
    modal: true,
    showNew: this.currentStatus() === 'active' && !this.showingNewRepayment(),
    newRoles: ['PRESTAMOS_EDITOR'],
  }));

  readonly statusOptions: SelectCatalogOption[] = [
    { id: '', name: 'Todos' },
    { id: 'applied', name: 'Aplicado' },
    { id: 'reversed', name: 'Revertido' },
  ];
  readonly sourceOptions: SelectCatalogOption[] = [
    { id: '', name: 'Todos' },
    { id: 'manual', name: 'Manual' },
    { id: 'payroll', name: 'Nómina' },
  ];

  readonly permissions: TableActionPermissions = { showEdit: false, showDelete: false };
  readonly columnsConfig: ColumnsConfig[] = [
    { key: 'applied_on', label: 'Fecha', type: 'date', sortable: true, sortKey: 'applied_on' },
    { key: 'amount_value', label: 'Monto', type: 'money', align: 'right', sortable: true, sortKey: 'amount' },
    { key: 'source_label', label: 'Origen', sortable: true, sortKey: 'source' },
    { key: 'source_reference', label: 'Referencia', fallback: '—' },
    {
      key: 'status_label',
      label: 'Estatus',
      type: 'chip',
      sortable: true,
      sortKey: 'status',
      variantResolver: (row: RepaymentRow): ColumnVariant =>
        row.status === 'applied' ? 'chip-success' : 'chip-danger',
    },
  ];
  readonly displayedColumns = [...this.columnsConfig.map((column) => column.key), 'actions'];
  readonly actions: DataTableExtraAction<RepaymentRow>[] = [
    {
      type: 'reverse',
      icon: 'undo',
      tooltip: 'Revertir abono manual',
      visible: (row) => row.source === 'manual' && row.status === 'applied',
      disabled: () => this.loading() || this.saving() || this.showingNewRepayment() || !!this.reversingRepaymentId,
    },
  ];

  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly formFilters = this.fb.group({
    status: this.fb.control<RepaymentStatus | null>(null),
    source: this.fb.control<RepaymentSource | null>(null),
    dateRange: this.fb.control<DateRangeValue | null>(null),
  });

  readonly newRepaymentForm = this.fb.nonNullable.group({
    amount: [null, [Validators.required, Validators.min(0.01), Validators.max(9999999999.99)]],
    applied_on: [localDate(), Validators.required],
    source_reference: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
  });

  readonly reversalForm = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
  });

  filters: RepaymentsFilters = { page: 1, limit: 5, sorts: [] };
  sorts: FinanceSortItem[] = [];
  tableData: { data: RepaymentRow[]; meta: { total: number } } = {
    data: [],
    meta: { total: 0 },
  };
  changed = false;
  message = '';

  ngOnInit(): void {
    this.loadRepayments();
  }

  get hasActiveFilters(): boolean {
    const value = this.formFilters.getRawValue();
    return Boolean(
      value.status || value.source || value.dateRange?.startDate ||
      value.dateRange?.endDate || this.sorts.length > 0,
    );
  }

  private toRow(item: LoanRepaymentDto): RepaymentRow {
    return {
      ...item,
      id: String(item.id), // BIGINT como string.
      loan_id: String(item.loan_id),
      amount_value: Number(item.amount ?? 0),
      source_label: item.source === 'manual' ? 'Manual' : 'Nómina',
      status_label: item.status === 'applied' ? 'Aplicado' : 'Revertido',
    };
  }

  private loadRepayments(): void {
    this.listSubscription?.unsubscribe();
    this.loading.set(true);
    this.listSubscription = this.loans.getRepayments(this.data.loan.id, this.filters)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const lastPage = Math.max(1, Math.ceil(response.meta.total / this.filters.limit));
          if (this.filters.page > lastPage) {
            this.filters = { ...this.filters, page: lastPage };
            this.loadRepayments();
            return;
          }
          this.tableData = {
            data: (response.data ?? []).map((row) => this.toRow(row)),
            meta: { total: response.meta.total },
          };
          this.summary.set({ ...EMPTY_SUMMARY, ...response.summary });
        },
        error: (error) => {
          console.error('Error consultando abonos del préstamo:', error);
          this.tableData = { data: [], meta: { total: 0 } };
          this.summary.set({ ...EMPTY_SUMMARY });
          this.message = this.resolveError(error, 'No se pudo cargar el historial de abonos.');
        },
      });
  }

  onHeaderAction(action: string): void {
    if (action === 'close') this.close();
    if (action === 'new') this.openNewRepayment();
  }

  onFilterAction(action: string): void {
    if (action === 'search') this.applyFilters();
    if (action === 'clean') this.clearFilters();
  }

  onFooterAction(action: string): void {
    if (action === 'close' || action === 'cancel') this.close();
  }

  applyFilters(): void {
    const v = this.formFilters.getRawValue();
    const from = v.dateRange?.startDate ?? null;
    const to = v.dateRange?.endDate ?? null;
    this.message = '';
    if (from && to && from > to) {
      this.message = 'La fecha final no puede ser anterior a la inicial.';
      return;
    }
    this.filters = {
      page: 1,
      limit: this.filters.limit,
      sorts: [...this.sorts],
      ...(v.status ? { status: v.status } : {}),
      ...(v.source ? { source: v.source } : {}),
      ...(from ? { applied_from: from } : {}),
      ...(to ? { applied_to: to } : {}),
    };
    this.loadRepayments();
  }

  clearFilters(): void {
    this.sorts = [];
    this.message = '';
    this.formFilters.reset({ status: null, source: null, dateRange: null });
    this.filters = { page: 1, limit: this.filters.limit, sorts: [] };
    this.loadRepayments();
  }

  onSortChange(event: DataTableSortEvent): void {
    const allowed = new Set(['applied_on', 'amount', 'source', 'status', 'created_at', 'id']);
    this.sorts = event.sorts.filter((x) => allowed.has(x.key))
      .map((x) => ({ key: x.key, direction: x.direction }));
    this.filters = { ...this.filters, page: 1, sorts: [...this.sorts] };
    this.loadRepayments();
  }

  onPageChange(event: PageEvent): void {
    this.filters = { ...this.filters, page: event.pageIndex + 1, limit: event.pageSize };
    this.loadRepayments();
  }

  onTableAction(event: DataTableActionEvent<RepaymentRow>): void {
    const row = event.row;
    if (
      event.type !== 'reverse' || row.source !== 'manual' || row.status !== 'applied' ||
      this.loading() || this.saving() || this.showingNewRepayment() || this.reversingRepaymentId
    ) {
      return;
    }
    this.reversingRepaymentId = String(row.id);
    this.reversalForm.reset({ reason: '' });
    this.message = '';
  }

  openNewRepayment(): void {
    if (this.currentStatus() !== 'active' || this.saving() || this.loading()) return;
    this.reversingRepaymentId = null;
    this.showingNewRepayment.set(true);
    this.message = '';
  }

  cancelNewRepayment(): void {
    if (this.saving()) return;
    this.showingNewRepayment.set(false);
    this.message = '';
  }

  cancelReverse(): void {
    if (this.saving()) return;
    this.reversingRepaymentId = null;
    this.message = '';
  }

  onRepaymentFormAction(action: string): void {
    if (action === 'save') this.addRepayment();
    if (action === 'cancel') this.cancelNewRepayment();
  }

  onReversalFormAction(action: string): void {
    if (action === 'save') this.confirmReverse();
    if (action === 'cancel') this.cancelReverse();
  }

  confirmReverse(): void {
    const repaymentId = this.reversingRepaymentId;
    if (!repaymentId || this.saving() || this.reversalForm.invalid ||
      this.reversalForm.controls.reason.value.trim().length < 5) {
      this.reversalForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.message = '';
    this.loans.reverseManualRepayment(
      this.data.loan.id,
      repaymentId,
      this.reversalForm.controls.reason.value.trim(),
    )
      .pipe(take(1), takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.changed = true;
          this.currentStatus.set('active');
          if (response.remaining_balance != null) {
            this.currentBalance.set(Number(response.remaining_balance));
          }
          this.reversingRepaymentId = null;
          this.loadRepayments();
        },
        error: (error) => {
          console.error('No se pudo revertir el abono:', error);
          this.message = this.resolveError(error, 'No se pudo revertir el abono.');
        },
      });
  }

  addRepayment(): void {
    this.message = '';
    if (this.saving() || this.currentStatus() !== 'active' || this.newRepaymentForm.invalid) {
      this.newRepaymentForm.markAllAsTouched();
      this.message = 'Revisa los datos. Solo los préstamos activos admiten abonos manuales.';
      return;
    }

    const v = this.newRepaymentForm.getRawValue();
    const amount = Number(v.amount);
    if (
      !Number.isFinite(amount) || amount <= 0 ||
      Math.abs(Math.round(amount * 100) - amount * 100) > 1e-7 ||
      amount > this.currentBalance() || v.source_reference.trim().length < 3
    ) {
      this.message = 'Monto inválido, saldo insuficiente o referencia menor de 3 caracteres.';
      return;
    }
    if (!this.data.loan.disbursed_on || !v.applied_on || v.applied_on < this.data.loan.disbursed_on) {
      this.message = 'La fecha del abono no puede ser anterior al desembolso.';
      return;
    }

    this.saving.set(true);
    this.loans.recordManualRepayment(this.data.loan.id, {
      amount,
      applied_on: v.applied_on,
      source_reference: v.source_reference.trim(),
    })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.changed = true;
          if (response.remaining_balance != null) {
            this.currentBalance.set(Number(response.remaining_balance));
          }
          if (response.loan_status === 'settled' || this.currentBalance() === 0) {
            this.currentStatus.set('settled');
          }
          this.newRepaymentForm.reset({ amount: null, applied_on: localDate(), source_reference: '' });
          this.showingNewRepayment.set(false);
          this.loadRepayments();
        },
        error: (error) => {
          console.error('No se pudo registrar el abono:', error);
          this.message = this.resolveError(error, 'No se pudo registrar el abono.');
        },
      });
  }

  private resolveError(error: unknown, fallback: string): string {
    const payload = (error as { error?: { message?: string | string[] } })?.error?.message;
    if (Array.isArray(payload)) return payload.join(' ');
    if (typeof payload === 'string' && payload.trim()) return payload.trim();
    return fallback;
  }

  close(): void {
    if (!this.saving()) this.ref.close(this.changed);
  }
}
