import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WarehouseLots } from './warehouse-lots';

describe('WarehouseLots', () => {
  let component: WarehouseLots;
  let fixture: ComponentFixture<WarehouseLots>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WarehouseLots]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WarehouseLots);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
