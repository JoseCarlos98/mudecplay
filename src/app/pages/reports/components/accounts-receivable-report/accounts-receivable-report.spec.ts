import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountsReceivableReport } from './accounts-receivable-report';

describe('AccountsReceivableReport', () => {
  let component: AccountsReceivableReport;
  let fixture: ComponentFixture<AccountsReceivableReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountsReceivableReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountsReceivableReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
