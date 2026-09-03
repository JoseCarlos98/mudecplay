import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAccountsReceivableBulkClassification } from './modal-accounts-receivable-bulk-classification';

describe('ModalAccountsReceivableBulkClassification', () => {
  let component: ModalAccountsReceivableBulkClassification;
  let fixture: ComponentFixture<ModalAccountsReceivableBulkClassification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAccountsReceivableBulkClassification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAccountsReceivableBulkClassification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
