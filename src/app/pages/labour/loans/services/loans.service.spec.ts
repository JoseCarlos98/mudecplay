import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { LoansService } from './loans.service';

describe('LoansService', () => {
  let service: LoansService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoansService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoansService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('envía los IDs múltiples y mantiene los parámetros de paginación y ordenamiento', () => {
    service.getLoans({
      page: 2, limit: 10, employee_ids: [8, 11], status: 'active',
      sorts: [{ key: 'remaining_balance', direction: 'desc' }],
    }).subscribe((result) => expect(result.meta.page).toBe(2));

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/employee-finance/loans`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('employee_ids')).toBe('8,11');
    expect(req.request.params.get('status')).toBe('active');
    expect(req.request.params.get('sort')).toBe('remaining_balance:desc');
    req.flush({ data: [], meta: { total: 0, page: 2, limit: 10 }, summary: {
      pending_count: 0, active_count: 0, settled_count: 0, cancelled_count: 0,
      disbursed_principal_total: 0, remaining_balance_total: 0,
    } });
  });
});
