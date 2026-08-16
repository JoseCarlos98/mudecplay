import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalBankMovementClassification } from './modal-bank-movement-classification';

describe('ModalBankMovementClassification', () => {
  let component: ModalBankMovementClassification;
  let fixture: ComponentFixture<ModalBankMovementClassification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalBankMovementClassification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalBankMovementClassification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
