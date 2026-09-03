import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAccountsReceivableManualClose } from './modal-accounts-receivable-manual-close';

describe('ModalAccountsReceivableManualClose', () => {
  let component: ModalAccountsReceivableManualClose;
  let fixture: ComponentFixture<ModalAccountsReceivableManualClose>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAccountsReceivableManualClose]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAccountsReceivableManualClose);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
