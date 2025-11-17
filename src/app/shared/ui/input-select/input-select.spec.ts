import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputSelect } from './input-select';

describe('InputSelect', () => {
  let component: InputSelect;
  let fixture: ComponentFixture<InputSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputSelect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
