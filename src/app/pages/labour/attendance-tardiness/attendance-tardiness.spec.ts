import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceTardiness } from './attendance-tardiness';

describe('AttendanceTardiness', () => {
  let component: AttendanceTardiness;
  let fixture: ComponentFixture<AttendanceTardiness>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceTardiness]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceTardiness);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
