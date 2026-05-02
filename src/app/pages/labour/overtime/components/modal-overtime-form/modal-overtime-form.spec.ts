import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalOvertimeForm } from './modal-overtime-form';

describe('ModalOvertimeForm', () => {
  let component: ModalOvertimeForm;
  let fixture: ComponentFixture<ModalOvertimeForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalOvertimeForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalOvertimeForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
