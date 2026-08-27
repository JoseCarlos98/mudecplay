import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalTreasuryAccountsReceivable } from './modal-treasury-accounts-receivable';

describe('ModalTreasuryAccountsReceivable', () => {
  let component: ModalTreasuryAccountsReceivable;
  let fixture: ComponentFixture<ModalTreasuryAccountsReceivable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalTreasuryAccountsReceivable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalTreasuryAccountsReceivable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
