import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPurchaseDecline } from './modal-purchase-decline';

describe('ModalPurchaseDecline', () => {
  let component: ModalPurchaseDecline;
  let fixture: ComponentFixture<ModalPurchaseDecline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalPurchaseDecline]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalPurchaseDecline);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
