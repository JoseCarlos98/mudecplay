import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAccountsReceivableClassification } from './modal-accounts-receivable-classification';

describe('ModalAccountsReceivableClassification', () => {
  let component: ModalAccountsReceivableClassification;
  let fixture: ComponentFixture<ModalAccountsReceivableClassification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAccountsReceivableClassification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAccountsReceivableClassification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
