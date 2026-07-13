import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryBankMovements } from './treasury-bank-movements';

describe('TreasuryBankMovements', () => {
  let component: TreasuryBankMovements;
  let fixture: ComponentFixture<TreasuryBankMovements>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryBankMovements]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryBankMovements);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
