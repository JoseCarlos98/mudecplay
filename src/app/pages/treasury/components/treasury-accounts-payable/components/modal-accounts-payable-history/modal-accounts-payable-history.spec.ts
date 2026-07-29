import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAccountsPayableHistory } from './modal-accounts-payable-history';

describe('ModalAccountsPayableHistory', () => {
  let component: ModalAccountsPayableHistory;
  let fixture: ComponentFixture<ModalAccountsPayableHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAccountsPayableHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAccountsPayableHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
