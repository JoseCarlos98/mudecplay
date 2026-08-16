import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPurchaseCancel } from './modal-purchase-cancel';

describe('ModalPurchaseCancel', () => {
  let component: ModalPurchaseCancel;
  let fixture: ComponentFixture<ModalPurchaseCancel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalPurchaseCancel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalPurchaseCancel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
