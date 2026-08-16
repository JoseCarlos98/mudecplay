import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalCashPayment } from './modal-cash-payment';

describe('ModalCashPayment', () => {
  let component: ModalCashPayment;
  let fixture: ComponentFixture<ModalCashPayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalCashPayment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalCashPayment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
