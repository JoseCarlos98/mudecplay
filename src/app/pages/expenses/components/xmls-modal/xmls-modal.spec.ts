import { ComponentFixture, TestBed } from '@angular/core/testing';

import { XmlsModal } from './xmls-modal';

describe('XmlsModal', () => {
  let component: XmlsModal;
  let fixture: ComponentFixture<XmlsModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XmlsModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(XmlsModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
