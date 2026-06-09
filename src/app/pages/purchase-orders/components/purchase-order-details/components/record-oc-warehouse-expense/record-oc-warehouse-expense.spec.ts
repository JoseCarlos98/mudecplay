import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordOcWarehouseExpense } from './record-oc-warehouse-expense';

describe('RecordOcWarehouseExpense', () => {
  let component: RecordOcWarehouseExpense;
  let fixture: ComponentFixture<RecordOcWarehouseExpense>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordOcWarehouseExpense]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordOcWarehouseExpense);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
