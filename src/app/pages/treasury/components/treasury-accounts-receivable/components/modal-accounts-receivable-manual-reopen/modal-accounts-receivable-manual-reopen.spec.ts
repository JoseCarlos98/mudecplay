import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAccountsReceivableManualReopen } from './modal-accounts-receivable-manual-reopen';

describe('ModalAccountsReceivableManualReopen', () => {
  let component: ModalAccountsReceivableManualReopen;
  let fixture: ComponentFixture<ModalAccountsReceivableManualReopen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAccountsReceivableManualReopen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAccountsReceivableManualReopen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
