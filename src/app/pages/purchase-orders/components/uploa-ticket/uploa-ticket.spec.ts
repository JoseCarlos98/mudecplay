import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploaTicket } from './uploa-ticket';

describe('UploaTicket', () => {
  let component: UploaTicket;
  let fixture: ComponentFixture<UploaTicket>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploaTicket]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploaTicket);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
