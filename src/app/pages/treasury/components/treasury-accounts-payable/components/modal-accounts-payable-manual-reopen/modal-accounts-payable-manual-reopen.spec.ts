import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAccountsPayableManualReopen } from './modal-accounts-payable-manual-reopen';

describe('ModalAccountsPayableManualReopen', () => {
  let component: ModalAccountsPayableManualReopen;
  let fixture: ComponentFixture<ModalAccountsPayableManualReopen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAccountsPayableManualReopen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAccountsPayableManualReopen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
