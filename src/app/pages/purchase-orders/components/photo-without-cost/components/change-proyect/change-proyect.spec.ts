import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeProyect } from './change-proyect';

describe('ChangeProyect', () => {
  let component: ChangeProyect;
  let fixture: ComponentFixture<ChangeProyect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeProyect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeProyect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
