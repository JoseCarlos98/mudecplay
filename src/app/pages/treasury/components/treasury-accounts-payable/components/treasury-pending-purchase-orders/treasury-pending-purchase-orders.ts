import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';

import * as entity from '../../interfaces/treasury-accounts-payable.interfaces';
import { TreasuryAccountsPayableService } from '../../services/treasury-accounts-payable.service';

@Component({
  selector: 'app-treasury-pending-purchase-orders',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatPaginatorModule,
  ],
  templateUrl: './treasury-pending-purchase-orders.html',
  styleUrl: './treasury-pending-purchase-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryPendingPurchaseOrders implements OnInit {
  private readonly accountsPayableService = inject(TreasuryAccountsPayableService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly expandedOrderId = signal<number | null>(null);

  readonly filters = signal<entity.TreasuryPendingPurchaseOrderFilters>({
    page: 1,
    limit: 10,
    sorts: [],
  });

  readonly tableData = signal<entity.TreasuryPendingPurchaseOrdersResponse>({
    data: [],
    summary: {
      orders_count: 0,
      items_count: 0,
      pending_items_count: 0,
      paid_items_count: 0,
      original_amount: 0,
      paid_amount: 0,
      pending_amount: 0,
    },
    meta: {
      page: 1,
      limit: 10,
      total: 0,
      total_pages: 0,
    },
  });

  // Evita que una respuesta antigua reemplace la página actual.
  private requestSequence = 0;

  ngOnInit(): void {
    this.loadPendingPurchaseOrders();
  }

  loadPendingPurchaseOrders(): void {
    const requestSequence = ++this.requestSequence;
    const filters = { ...this.filters() };

    this.loading.set(true);
    this.loadError.set(false);

    this.accountsPayableService
      .getPendingPurchaseOrders(filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestSequence === this.requestSequence) {
            this.loading.set(false);
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (requestSequence !== this.requestSequence) {
            return;
          }

          this.tableData.set(response);
          this.expandedOrderId.set(null);
        },
        error: (error: unknown) => {
          if (requestSequence !== this.requestSequence) {
            return;
          }

          this.loadError.set(true);
          console.error('Error cargando órdenes de compra pendientes:', error);
        },
      });
  }

  toggleOrder(orderId: number): void {
    this.expandedOrderId.update((current) =>
      current === orderId ? null : orderId,
    );
  }

  onPageChange(event: PageEvent): void {
    this.filters.update((filters) => ({
      ...filters,
      page: event.pageIndex + 1,
      limit: event.pageSize,
    }));

    this.loadPendingPurchaseOrders();
  }

  getPaymentStatusLabel(
    status: entity.TreasuryPendingPurchaseOrderPaymentStatus,
  ): string {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'partial':
        return 'Parcial';
      case 'unpaid':
        return 'Pendiente';
      default:
        return 'Sin importe';
    }
  }
}
