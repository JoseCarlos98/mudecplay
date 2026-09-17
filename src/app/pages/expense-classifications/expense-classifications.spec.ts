import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseClassifications } from './expense-classifications';

describe('ExpenseClassifications', () => {
  let component: ExpenseClassifications;
  let fixture: ComponentFixture<ExpenseClassifications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseClassifications]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseClassifications);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
