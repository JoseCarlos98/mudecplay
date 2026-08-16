import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryImportFiles } from './treasury-import-files';

describe('TreasuryImportFiles', () => {
  let component: TreasuryImportFiles;
  let fixture: ComponentFixture<TreasuryImportFiles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasuryImportFiles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreasuryImportFiles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
