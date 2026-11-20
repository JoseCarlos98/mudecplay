import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize, Subscription, take } from 'rxjs';
import { DataTable } from '../../../../../shared/ui/data-table/data-table';
import {
  ColumnsConfig, ColumnVariant, DataTableActionEvent, DataTableExtraAction,
  DataTableSortEvent, TableActionPermissions,
} from '../../../../../shared/ui/data-table/interfaces/table-interfaces';
import { LoansService } from '../../services/loans.service';
import {
  EmployeeLoanDto, FinanceSortItem, LoanRepaymentDto, LoanStatus,
  RepaymentSource, RepaymentStatus, RepaymentsFilters, RepaymentsSummary,
} from '../../interfaces/loans-interfaces';

interface RepaymentRow extends LoanRepaymentDto {
  amount_value: number;
  status_label: string;
  source_label: string;
}
function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
const EMPTY_SUMMARY: RepaymentsSummary = { applied_count: 0, reversed_count: 0, applied_amount_total: 0 };
@Component({
  selector: 'app-modal-loan-repayments', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatPaginatorModule, DataTable],
  templateUrl: './modal-loan-repayments.html', styleUrl: './modal-loan-repayments.scss',
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
  readonly permissions: TableActionPermissions = { showEdit: false, showDelete: false };
  readonly columnsConfig: ColumnsConfig[] = [
    { key: 'applied_on', label: 'Fecha', type: 'date', sortable: true, sortKey: 'applied_on' },
    { key: 'amount_value', label: 'Monto', type: 'money', align: 'right', sortable: true, sortKey: 'amount' },
    { key: 'source_label', label: 'Origen', sortable: true, sortKey: 'source' },
    { key: 'source_reference', label: 'Referencia', fallback: '—' },
    {
      key: 'status_label', label: 'Estatus', type: 'chip', sortable: true, sortKey: 'status',
      variantResolver: (row: RepaymentRow): ColumnVariant => row.status === 'applied' ? 'chip-success' : 'chip-danger',
    },
  ];
  readonly displayedColumns = this.columnsConfig.map((x) => x.key).concat('actions');
  readonly actions: DataTableExtraAction<RepaymentRow>[] = [
    {
      type: 'reverse', icon: 'undo', tooltip: 'Revertir abono manual',
      visible: (row) => row.source === 'manual' && row.status === 'applied',
      disabled: () => this.loading() || this.saving(),
    },
  ];
  readonly pageSizeOptions = [5, 10, 25, 50];
  readonly formFilters = this.fb.nonNullable.group({
    status: [''], source: [''], appliedFrom: [''], appliedTo: [''],
  });
  readonly newRepaymentForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01), Validators.max(9999999999.99)]],
    applied_on: [localDate(), Validators.required],
    source_reference: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
  });
  readonly reversalForm = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
  });
  filters: RepaymentsFilters = { page: 1, limit: 5, sorts: [] };
  sorts: FinanceSortItem[] = [];
  tableData: { data: RepaymentRow[]; meta: { total: number } } = { data: [], meta: { total: 0 } };
  changed = false;
  reversingRepaymentId: string | null = null;
  message = '';

  ngOnInit(): void { this.loadRepayments(); }
  private toRow(item: LoanRepaymentDto): RepaymentRow {
    return {
      ...item,
      id: String(item.id), loan_id: String(item.loan_id),
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
            this.filters.page = lastPage;
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
        },
      });
  }
  applyFilters(): void {
    const v = this.formFilters.getRawValue();
    this.message = '';
    if (v.appliedFrom && v.appliedTo && v.appliedFrom > v.appliedTo) {
      this.message = 'La fecha final no puede ser anterior a la inicial.';
      return;
    }
    this.filters = {
      page: 1, limit: this.filters.limit, sorts: [...this.sorts],
      ...(v.status ? { status: v.status as RepaymentStatus } : {}),
      ...(v.source ? { source: v.source as RepaymentSource } : {}),
      ...(v.appliedFrom ? { applied_from: v.appliedFrom } : {}),
      ...(v.appliedTo ? { applied_to: v.appliedTo } : {}),
    };
    this.loadRepayments();
  }
  clearFilters(): void {
    this.sorts = [];
    this.formFilters.reset({ status: '', source: '', appliedFrom: '', appliedTo: '' });
    this.filters = { page: 1, limit: this.filters.limit, sorts: [] };
    this.loadRepayments();
  }
  onSortChange(event: DataTableSortEvent): void {
    const allowed = new Set(['applied_on', 'amount', 'source', 'status', 'created_at', 'id']);
    this.sorts = event.sorts.filter((x) => allowed.has(x.key))
      .map((x) => ({ key: x.key, direction: x.direction }));
    this.filters.page = 1;
    this.filters.sorts = [...this.sorts];
    this.loadRepayments();
  }
  onPageChange(event: PageEvent): void {
    this.filters.page = event.pageIndex + 1;
    this.filters.limit = event.pageSize;
    this.loadRepayments();
  }
  onTableAction(event: DataTableActionEvent<RepaymentRow>): void {
    const row = event.row;
    if (event.type !== 'reverse' || row.source !== 'manual' || row.status !== 'applied' || this.saving()) return;
    this.reversingRepaymentId = row.id;
    this.reversalForm.reset({ reason: '' });
  }
  cancelReverse(): void { this.reversingRepaymentId = null; }
  confirmReverse(): void {
    if (!this.reversingRepaymentId || this.reversalForm.invalid || this.reversalForm.controls.reason.value.trim().length < 5 || this.saving()) {
      this.reversalForm.markAllAsTouched();
      return;
    }
    const repaymentId = this.reversingRepaymentId;
    this.saving.set(true);
    this.message = '';
    this.loans.reverseManualRepayment(
      this.data.loan.id, repaymentId, this.reversalForm.controls.reason.value.trim(),
    ).pipe(take(1), takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.changed = true;
          this.currentStatus.set('active');
          if (response.remaining_balance != null) this.currentBalance.set(Number(response.remaining_balance));
          this.reversingRepaymentId = null;
          this.loadRepayments();
        },
        error: (error) => console.error('No se pudo revertir el abono', error),
      });
  }
  addRepayment(): void {
    this.message = '';
    if (this.currentStatus() !== 'active' || this.saving() || this.newRepaymentForm.invalid) {
      this.newRepaymentForm.markAllAsTouched();
      this.message = 'Solo los préstamos activos pueden recibir abonos manuales.';
      return;
    }
    const v = this.newRepaymentForm.getRawValue();
    const amount = Number(v.amount);
    if (Math.abs(Math.round(amount * 100) - amount * 100) > 1e-7 || amount > this.currentBalance() || v.source_reference.trim().length < 3) {
      this.message = 'Monto inválido, saldo insuficiente o referencia menor de 3 caracteres.';
      return;
    }
    if (!this.data.loan.disbursed_on || v.applied_on < this.data.loan.disbursed_on) {
      this.message = 'La fecha del abono no puede ser anterior al desembolso.';
      return;
    }
    this.saving.set(true);
    this.loans.recordManualRepayment(this.data.loan.id, {
      amount, applied_on: v.applied_on, source_reference: v.source_reference.trim(),
    }).pipe(take(1), takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.changed = true;
          if (response.remaining_balance != null) this.currentBalance.set(Number(response.remaining_balance));
          if (response.loan_status === 'settled' || this.currentBalance() === 0) this.currentStatus.set('settled');
          // Sólo después del éxito se borra la referencia; si falla, se conserva para reintentar idempotentemente.
          this.newRepaymentForm.reset({ amount: 0, applied_on: localDate(), source_reference: '' });
          this.loadRepayments();
        },
        error: (error) => console.error('No se pudo registrar el abono', error),
      });
  }
  close(): void { if (!this.saving()) this.ref.close(this.changed); }
}
