import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaModal } from './area-modal';

describe('AreaModal', () => {
  let component: AreaModal;
  let fixture: ComponentFixture<AreaModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AreaModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
