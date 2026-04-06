import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeAreas } from './employee-areas';

describe('EmployeeAreas', () => {
  let component: EmployeeAreas;
  let fixture: ComponentFixture<EmployeeAreas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeAreas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeAreas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
