import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPurchaseOrderAuthorized } from './modal-purchase-order-authorized';

describe('ModalPurchaseOrderAuthorized', () => {
  let component: ModalPurchaseOrderAuthorized;
  let fixture: ComponentFixture<ModalPurchaseOrderAuthorized>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalPurchaseOrderAuthorized]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalPurchaseOrderAuthorized);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
