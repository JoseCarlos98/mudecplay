import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderForm } from './purchase-order-form';

describe('PurchaseOrderForm', () => {
  let component: PurchaseOrderForm;
  let fixture: ComponentFixture<PurchaseOrderForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
