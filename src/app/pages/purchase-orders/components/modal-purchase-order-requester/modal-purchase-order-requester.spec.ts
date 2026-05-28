import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPurchaseOrderRequester } from './modal-purchase-order-requester';

describe('ModalPurchaseOrderRequester', () => {
  let component: ModalPurchaseOrderRequester;
  let fixture: ComponentFixture<ModalPurchaseOrderRequester>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalPurchaseOrderRequester]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalPurchaseOrderRequester);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
