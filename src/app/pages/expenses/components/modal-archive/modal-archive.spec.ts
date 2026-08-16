import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalArchive } from './modal-archive';

describe('ModalArchive', () => {
  let component: ModalArchive;
  let fixture: ComponentFixture<ModalArchive>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalArchive]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalArchive);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
