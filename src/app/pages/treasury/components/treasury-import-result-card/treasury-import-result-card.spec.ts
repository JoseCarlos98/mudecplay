import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryImportResultCard } from './treasury-import-result-card';

describe('TreasuryImportResultCard', () => {
  let component: TreasuryImportResultCard;
  let fixture: ComponentFixture<TreasuryImportResultCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryImportResultCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryImportResultCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
