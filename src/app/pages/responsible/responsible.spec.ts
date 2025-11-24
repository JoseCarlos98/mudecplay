import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Responsible } from './responsible';

describe('Responsible', () => {
  let component: Responsible;
  let fixture: ComponentFixture<Responsible>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Responsible]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Responsible);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
