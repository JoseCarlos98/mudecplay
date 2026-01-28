import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplierReport } from './supplier-report';

describe('SupplierReport', () => {
  let component: SupplierReport;
  let fixture: ComponentFixture<SupplierReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupplierReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
