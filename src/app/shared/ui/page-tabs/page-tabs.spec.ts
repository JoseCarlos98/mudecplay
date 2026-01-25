import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageTabs } from './page-tabs';

describe('PageTabs', () => {
  let component: PageTabs;
  let fixture: ComponentFixture<PageTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageTabs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageTabs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
