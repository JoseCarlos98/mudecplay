import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryPendingPurchaseOrders } from './treasury-pending-purchase-orders';

describe('TreasuryPendingPurchaseOrders', () => {
  let component: TreasuryPendingPurchaseOrders;
  let fixture: ComponentFixture<TreasuryPendingPurchaseOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryPendingPurchaseOrders]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryPendingPurchaseOrders);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
