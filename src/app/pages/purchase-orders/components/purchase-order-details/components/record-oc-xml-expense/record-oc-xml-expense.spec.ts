import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordOcXmlExpense } from './record-oc-xml-expense';

describe('RecordOcXmlExpense', () => {
  let component: RecordOcXmlExpense;
  let fixture: ComponentFixture<RecordOcXmlExpense>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordOcXmlExpense]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordOcXmlExpense);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
