import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuleHeader } from './module-header';

describe('ModuleHeader', () => {
  let component: ModuleHeader;
  let fixture: ComponentFixture<ModuleHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModuleHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
