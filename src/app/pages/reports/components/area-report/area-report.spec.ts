import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaReport } from './area-report';

describe('AreaReport', () => {
  let component: AreaReport;
  let fixture: ComponentFixture<AreaReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AreaReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
