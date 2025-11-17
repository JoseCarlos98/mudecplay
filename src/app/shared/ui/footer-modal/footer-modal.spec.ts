import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterModal } from './footer-modal';

describe('FooterModal', () => {
  let component: FooterModal;
  let fixture: ComponentFixture<FooterModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
