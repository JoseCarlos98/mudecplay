import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAuthorizePurchaseOrder } from './modal-authorize-purchase-order';

describe('ModalAuthorizePurchaseOrder', () => {
  let component: ModalAuthorizePurchaseOrder;
  let fixture: ComponentFixture<ModalAuthorizePurchaseOrder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAuthorizePurchaseOrder]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAuthorizePurchaseOrder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
