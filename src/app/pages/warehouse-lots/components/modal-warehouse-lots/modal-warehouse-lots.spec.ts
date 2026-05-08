import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalWarehouseLots } from './modal-warehouse-lots';

describe('ModalWarehouseLots', () => {
  let component: ModalWarehouseLots;
  let fixture: ComponentFixture<ModalWarehouseLots>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalWarehouseLots]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalWarehouseLots);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
