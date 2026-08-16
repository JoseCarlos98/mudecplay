import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAccountsPayableReversePayment } from './modal-accounts-payable-reverse-payment';

describe('ModalAccountsPayableReversePayment', () => {
  let component: ModalAccountsPayableReversePayment;
  let fixture: ComponentFixture<ModalAccountsPayableReversePayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAccountsPayableReversePayment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAccountsPayableReversePayment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
