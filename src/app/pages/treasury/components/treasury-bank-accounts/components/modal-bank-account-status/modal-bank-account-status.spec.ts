import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalBankAccountStatus } from './modal-bank-account-status';

describe('ModalBankAccountStatus', () => {
  let component: ModalBankAccountStatus;
  let fixture: ComponentFixture<ModalBankAccountStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalBankAccountStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalBankAccountStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
