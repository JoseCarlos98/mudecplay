import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalSeePhoto } from './modal-see-photo';

describe('ModalSeePhoto', () => {
  let component: ModalSeePhoto;
  let fixture: ComponentFixture<ModalSeePhoto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalSeePhoto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalSeePhoto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
