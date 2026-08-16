import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryBankAccountForm } from './treasury-bank-account-form';

describe('TreasuryBankAccountForm', () => {
  let component: TreasuryBankAccountForm;
  let fixture: ComponentFixture<TreasuryBankAccountForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryBankAccountForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryBankAccountForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
