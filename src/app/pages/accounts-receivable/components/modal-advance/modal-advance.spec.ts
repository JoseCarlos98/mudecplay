import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAdvance } from './modal-advance';

describe('ModalAdvance', () => {
  let component: ModalAdvance;
  let fixture: ComponentFixture<ModalAdvance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAdvance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAdvance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
