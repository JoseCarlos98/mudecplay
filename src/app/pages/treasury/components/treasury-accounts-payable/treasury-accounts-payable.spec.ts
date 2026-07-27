import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryAccountsPayable } from './treasury-accounts-payable';

describe('TreasuryAccountsPayable', () => {
  let component: TreasuryAccountsPayable;
  let fixture: ComponentFixture<TreasuryAccountsPayable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryAccountsPayable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryAccountsPayable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
