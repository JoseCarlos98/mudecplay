import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountsReceivableForm } from './accounts-receivable-form';

describe('AccountsReceivableForm', () => {
  let component: AccountsReceivableForm;
  let fixture: ComponentFixture<AccountsReceivableForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountsReceivableForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountsReceivableForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
