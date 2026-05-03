import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalSunday } from './modal-sunday';

describe('ModalSunday', () => {
  let component: ModalSunday;
  let fixture: ComponentFixture<ModalSunday>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalSunday]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalSunday);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
