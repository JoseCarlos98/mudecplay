import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalWarehouseMovements } from './modal-warehouse-movements';

describe('ModalWarehouseMovements', () => {
  let component: ModalWarehouseMovements;
  let fixture: ComponentFixture<ModalWarehouseMovements>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalWarehouseMovements]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalWarehouseMovements);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
