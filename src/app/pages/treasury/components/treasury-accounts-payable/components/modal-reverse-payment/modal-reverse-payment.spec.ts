import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalReversePayment } from './modal-reverse-payment';

describe('ModalReversePayment', () => {
  let component: ModalReversePayment;
  let fixture: ComponentFixture<ModalReversePayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalReversePayment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalReversePayment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
