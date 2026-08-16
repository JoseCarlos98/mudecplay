import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoWithoutCost } from './photo-without-cost';

describe('PhotoWithoutCost', () => {
  let component: PhotoWithoutCost;
  let fixture: ComponentFixture<PhotoWithoutCost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoWithoutCost]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhotoWithoutCost);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
