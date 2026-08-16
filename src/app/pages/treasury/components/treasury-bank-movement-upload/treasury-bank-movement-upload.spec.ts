import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryBankMovementUpload } from './treasury-bank-movement-upload';

describe('TreasuryBankMovementUpload', () => {
  let component: TreasuryBankMovementUpload;
  let fixture: ComponentFixture<TreasuryBankMovementUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryBankMovementUpload]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryBankMovementUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
