import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Labour } from './labour';

describe('Labour', () => {
  let component: Labour;
  let fixture: ComponentFixture<Labour>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Labour]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Labour);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
