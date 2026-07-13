import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryBankMovementTypeBadge } from './treasury-bank-movement-type-badge';

describe('TreasuryBankMovementTypeBadge', () => {
  let component: TreasuryBankMovementTypeBadge;
  let fixture: ComponentFixture<TreasuryBankMovementTypeBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryBankMovementTypeBadge]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryBankMovementTypeBadge);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
