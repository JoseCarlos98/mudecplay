import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoReconcile } from './photo-reconcile';

describe('PhotoReconcile', () => {
  let component: PhotoReconcile;
  let fixture: ComponentFixture<PhotoReconcile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoReconcile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhotoReconcile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
