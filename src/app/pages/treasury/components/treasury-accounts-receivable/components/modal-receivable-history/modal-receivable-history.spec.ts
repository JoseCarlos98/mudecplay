import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalReceivableHistory } from './modal-receivable-history';

describe('ModalReceivableHistory', () => {
  let component: ModalReceivableHistory;
  let fixture: ComponentFixture<ModalReceivableHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalReceivableHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalReceivableHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
