import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalMarkAttendance } from './modal-mark-attendance';

describe('ModalMarkAttendance', () => {
  let component: ModalMarkAttendance;
  let fixture: ComponentFixture<ModalMarkAttendance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalMarkAttendance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalMarkAttendance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
