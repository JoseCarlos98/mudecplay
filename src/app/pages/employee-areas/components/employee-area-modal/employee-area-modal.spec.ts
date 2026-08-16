import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeAreaModal } from './employee-area-modal';

describe('EmployeeAreaModal', () => {
  let component: EmployeeAreaModal;
  let fixture: ComponentFixture<EmployeeAreaModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeAreaModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeAreaModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
