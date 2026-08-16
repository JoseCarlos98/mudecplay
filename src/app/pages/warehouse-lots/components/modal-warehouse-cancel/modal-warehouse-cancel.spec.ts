import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalWarehouseCancel } from './modal-warehouse-cancel';

describe('ModalWarehouseCancel', () => {
  let component: ModalWarehouseCancel;
  let fixture: ComponentFixture<ModalWarehouseCancel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalWarehouseCancel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalWarehouseCancel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
