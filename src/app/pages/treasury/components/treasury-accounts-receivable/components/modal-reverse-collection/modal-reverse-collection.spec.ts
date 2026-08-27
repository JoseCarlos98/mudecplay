import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalReverseCollection } from './modal-reverse-collection';

describe('ModalReverseCollection', () => {
  let component: ModalReverseCollection;
  let fixture: ComponentFixture<ModalReverseCollection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalReverseCollection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalReverseCollection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
