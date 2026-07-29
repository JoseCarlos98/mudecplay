import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalRegularizeHistoricalPayment } from './modal-regularize-historical-payment';

describe('ModalRegularizeHistoricalPayment', () => {
  let component: ModalRegularizeHistoricalPayment;
  let fixture: ComponentFixture<ModalRegularizeHistoricalPayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalRegularizeHistoricalPayment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalRegularizeHistoricalPayment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
