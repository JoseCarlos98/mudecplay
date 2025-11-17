import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputDate } from './input-date';

describe('InputDate', () => {
  let component: InputDate;
  let fixture: ComponentFixture<InputDate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputDate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputDate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
