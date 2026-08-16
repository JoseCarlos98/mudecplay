import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalOvertime } from './modal-overtime';

describe('ModalOvertime', () => {
  let component: ModalOvertime;
  let fixture: ComponentFixture<ModalOvertime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalOvertime]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalOvertime);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
