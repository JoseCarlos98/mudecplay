import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordOcWarehouseXmlExpense } from './record-oc-warehouse-xml-expense';

describe('RecordOcWarehouseXmlExpense', () => {
  let component: RecordOcWarehouseXmlExpense;
  let fixture: ComponentFixture<RecordOcWarehouseXmlExpense>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordOcWarehouseXmlExpense]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordOcWarehouseXmlExpense);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
