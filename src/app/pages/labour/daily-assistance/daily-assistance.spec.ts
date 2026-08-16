import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyAssistance } from './daily-assistance';

describe('DailyAssistance', () => {
  let component: DailyAssistance;
  let fixture: ComponentFixture<DailyAssistance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyAssistance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyAssistance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
