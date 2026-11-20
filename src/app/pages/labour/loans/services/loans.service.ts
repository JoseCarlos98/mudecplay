import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CreateLoanDto, CreateLoanRepaymentDto, DisburseLoanDto, FinanceActionResponse,
  LoansFilters, LoansPagedResponse, RepaymentsFilters, RepaymentsPagedResponse,
} from '../interfaces/loans-interfaces';

@Injectable({ providedIn: 'root' })
export class LoansService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/employee-finance/loans`;

  getLoans(filters: LoansFilters): Observable<LoansPagedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('limit', String(filters.limit));
    if (filters.employee_ids?.length) params = params.set('employee_ids', filters.employee_ids.join(','));
    if (filters.employee_name?.trim()) params = params.set('employee_name', filters.employee_name.trim());
    if (filters.status) params = params.set('status', filters.status);
    if (filters.requested_from) params = params.set('requested_from', filters.requested_from);
    if (filters.requested_to) params = params.set('requested_to', filters.requested_to);
    if (filters.sorts?.length) {
      params = params.set('sort', filters.sorts.map((x) => `${x.key}:${x.direction}`).join(','));
    }
    return this.http.get<LoansPagedResponse>(this.url, { params });
  }

  getRepayments(id: string, filters: RepaymentsFilters): Observable<RepaymentsPagedResponse> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('limit', String(filters.limit));
    if (filters.status) params = params.set('status', filters.status);
    if (filters.source) params = params.set('source', filters.source);
    if (filters.applied_from) params = params.set('applied_from', filters.applied_from);
    if (filters.applied_to) params = params.set('applied_to', filters.applied_to);
    if (filters.sorts?.length) {
      params = params.set('sort', filters.sorts.map((x) => `${x.key}:${x.direction}`).join(','));
    }
    return this.http.get<RepaymentsPagedResponse>(`${this.url}/${encodeURIComponent(id)}/repayments`, { params });
  }

  createLoan(body: CreateLoanDto): Observable<FinanceActionResponse> {
    return this.http.post<FinanceActionResponse>(this.url, body);
  }
  disburseLoan(id: string, body: DisburseLoanDto): Observable<FinanceActionResponse> {
    return this.http.patch<FinanceActionResponse>(`${this.url}/${encodeURIComponent(id)}/disburse`, body);
  }
  cancelLoan(id: string, cancellationReason: string): Observable<FinanceActionResponse> {
    return this.http.patch<FinanceActionResponse>(`${this.url}/${encodeURIComponent(id)}/cancel`, {
      cancellation_reason: cancellationReason,
    });
  }
  recordManualRepayment(id: string, body: CreateLoanRepaymentDto): Observable<FinanceActionResponse> {
    return this.http.post<FinanceActionResponse>(`${this.url}/${encodeURIComponent(id)}/repayments`, body);
  }
  reverseManualRepayment(id: string, repaymentId: string, reversalReason: string): Observable<FinanceActionResponse> {
    return this.http.patch<FinanceActionResponse>(
      `${this.url}/${encodeURIComponent(id)}/repayments/${encodeURIComponent(repaymentId)}/reverse`,
      { reversal_reason: reversalReason },
    );
  }
}
