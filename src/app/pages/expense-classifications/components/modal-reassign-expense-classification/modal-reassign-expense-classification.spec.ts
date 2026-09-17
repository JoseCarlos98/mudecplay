import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalReassignExpenseClassification } from './modal-reassign-expense-classification';

describe('ModalReassignExpenseClassification', () => {
  let component: ModalReassignExpenseClassification;
  let fixture: ComponentFixture<ModalReassignExpenseClassification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalReassignExpenseClassification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalReassignExpenseClassification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
