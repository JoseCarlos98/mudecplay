import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalTreasuryAccountsPayable } from './modal-treasury-accounts-payable';

describe('ModalTreasuryAccountsPayable', () => {
  let component: ModalTreasuryAccountsPayable;
  let fixture: ComponentFixture<ModalTreasuryAccountsPayable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalTreasuryAccountsPayable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalTreasuryAccountsPayable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
