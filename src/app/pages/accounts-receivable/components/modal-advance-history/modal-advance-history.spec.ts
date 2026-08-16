import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAdvanceHistory } from './modal-advance-history';

describe('ModalAdvanceHistory', () => {
  let component: ModalAdvanceHistory;
  let fixture: ComponentFixture<ModalAdvanceHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAdvanceHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAdvanceHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
