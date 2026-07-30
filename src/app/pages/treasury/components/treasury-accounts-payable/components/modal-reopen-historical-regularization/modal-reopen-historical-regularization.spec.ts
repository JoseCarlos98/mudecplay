import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalReopenHistoricalRegularization } from './modal-reopen-historical-regularization';

describe('ModalReopenHistoricalRegularization', () => {
  let component: ModalReopenHistoricalRegularization;
  let fixture: ComponentFixture<ModalReopenHistoricalRegularization>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalReopenHistoricalRegularization]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalReopenHistoricalRegularization);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
