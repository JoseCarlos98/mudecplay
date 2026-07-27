import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryAccountsReceivable } from './treasury-accounts-receivable';

describe('TreasuryAccountsReceivable', () => {
  let component: TreasuryAccountsReceivable;
  let fixture: ComponentFixture<TreasuryAccountsReceivable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryAccountsReceivable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryAccountsReceivable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
