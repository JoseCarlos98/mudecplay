import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAccountsPayableManualClose } from './modal-accounts-payable-manual-close';

describe('ModalAccountsPayableManualClose', () => {
  let component: ModalAccountsPayableManualClose;
  let fixture: ComponentFixture<ModalAccountsPayableManualClose>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAccountsPayableManualClose]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAccountsPayableManualClose);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
