import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalClockDecision } from './modal-clock-decision';

describe('ModalClockDecision', () => {
  let component: ModalClockDecision;
  let fixture: ComponentFixture<ModalClockDecision>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalClockDecision]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalClockDecision);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
