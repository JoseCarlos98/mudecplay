import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalWarehouseReturn } from './modal-warehouse-return';

describe('ModalWarehouseReturn', () => {
  let component: ModalWarehouseReturn;
  let fixture: ComponentFixture<ModalWarehouseReturn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalWarehouseReturn]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalWarehouseReturn);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
