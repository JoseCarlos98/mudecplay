import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalHistoricalPaymentHistory } from './modal-historical-payment-history';

describe('ModalHistoricalPaymentHistory', () => {
  let component: ModalHistoricalPaymentHistory;
  let fixture: ComponentFixture<ModalHistoricalPaymentHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalHistoricalPaymentHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalHistoricalPaymentHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
