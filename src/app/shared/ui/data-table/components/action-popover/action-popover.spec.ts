import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPopover } from './action-popover';

describe('ActionPopover', () => {
  let component: ActionPopover;
  let fixture: ComponentFixture<ActionPopover>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPopover]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPopover);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
