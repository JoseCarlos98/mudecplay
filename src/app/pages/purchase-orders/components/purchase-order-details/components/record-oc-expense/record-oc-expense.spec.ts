import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordOcExpense } from './record-oc-expense';

describe('RecordOcExpense', () => {
  let component: RecordOcExpense;
  let fixture: ComponentFixture<RecordOcExpense>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordOcExpense]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordOcExpense);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
