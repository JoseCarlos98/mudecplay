import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalExpenseItemPaymentHistory } from './modal-expense-item-payment-history';

describe('ModalExpenseItemPaymentHistory', () => {
  let component: ModalExpenseItemPaymentHistory;
  let fixture: ComponentFixture<ModalExpenseItemPaymentHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalExpenseItemPaymentHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalExpenseItemPaymentHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
