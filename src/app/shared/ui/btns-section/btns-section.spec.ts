import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BtnsSection } from './btns-section';

describe('BtnsSection', () => {
  let component: BtnsSection;
  let fixture: ComponentFixture<BtnsSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BtnsSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BtnsSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
