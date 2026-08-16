import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderDetails } from './purchase-order-details';

describe('PurchaseOrderDetails', () => {
  let component: PurchaseOrderDetails;
  let fixture: ComponentFixture<PurchaseOrderDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
