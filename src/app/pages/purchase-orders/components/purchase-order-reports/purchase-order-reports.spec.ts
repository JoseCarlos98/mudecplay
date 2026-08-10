import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderReports } from './purchase-order-reports';

describe('PurchaseOrderReports', () => {
  let component: PurchaseOrderReports;
  let fixture: ComponentFixture<PurchaseOrderReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderReports]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderReports);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
