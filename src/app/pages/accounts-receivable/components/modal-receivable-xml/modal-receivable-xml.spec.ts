import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalReceivableXml } from './modal-receivable-xml';

describe('ModalReceivableXml', () => {
  let component: ModalReceivableXml;
  let fixture: ComponentFixture<ModalReceivableXml>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalReceivableXml]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalReceivableXml);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
