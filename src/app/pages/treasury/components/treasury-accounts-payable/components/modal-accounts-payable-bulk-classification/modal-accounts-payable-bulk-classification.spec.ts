import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAccountsPayableBulkClassification } from './modal-accounts-payable-bulk-classification';

describe('ModalAccountsPayableBulkClassification', () => {
  let component: ModalAccountsPayableBulkClassification;
  let fixture: ComponentFixture<ModalAccountsPayableBulkClassification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAccountsPayableBulkClassification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAccountsPayableBulkClassification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
