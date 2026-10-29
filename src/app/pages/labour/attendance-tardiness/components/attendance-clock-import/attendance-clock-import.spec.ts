import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceClockImport } from './attendance-clock-import';

describe('AttendanceClockImport', () => {
  let component: AttendanceClockImport;
  let fixture: ComponentFixture<AttendanceClockImport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceClockImport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceClockImport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
