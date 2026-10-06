import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseAnalysis } from './expense-analysis';

describe('ExpenseAnalysis', () => {
  let component: ExpenseAnalysis;
  let fixture: ComponentFixture<ExpenseAnalysis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseAnalysis]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseAnalysis);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
