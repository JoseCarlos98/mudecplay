import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryBankMovementStatusBadge } from './treasury-bank-movement-status-badge';

describe('TreasuryBankMovementStatusBadge', () => {
  let component: TreasuryBankMovementStatusBadge;
  let fixture: ComponentFixture<TreasuryBankMovementStatusBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryBankMovementStatusBadge]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryBankMovementStatusBadge);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
