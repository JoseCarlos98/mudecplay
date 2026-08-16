import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalConciliarPhoto } from './modal-conciliar-photo';

describe('ModalConciliarPhoto', () => {
  let component: ModalConciliarPhoto;
  let fixture: ComponentFixture<ModalConciliarPhoto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalConciliarPhoto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalConciliarPhoto);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
