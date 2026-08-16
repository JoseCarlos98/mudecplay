import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryBankAccounts } from './treasury-bank-accounts';

describe('TreasuryBankAccounts', () => {
  let component: TreasuryBankAccounts;
  let fixture: ComponentFixture<TreasuryBankAccounts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryBankAccounts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryBankAccounts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
