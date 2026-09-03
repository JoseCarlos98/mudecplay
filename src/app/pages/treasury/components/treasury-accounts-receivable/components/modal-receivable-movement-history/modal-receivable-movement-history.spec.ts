import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalReceivableMovementHistory } from './modal-receivable-movement-history';

describe('ModalReceivableMovementHistory', () => {
  let component: ModalReceivableMovementHistory;
  let fixture: ComponentFixture<ModalReceivableMovementHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalReceivableMovementHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalReceivableMovementHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
