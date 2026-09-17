import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalExpenseReportClassification } from './modal-expense-report-classification';

describe('ModalExpenseReportClassification', () => {
  let component: ModalExpenseReportClassification;
  let fixture: ComponentFixture<ModalExpenseReportClassification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalExpenseReportClassification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalExpenseReportClassification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
