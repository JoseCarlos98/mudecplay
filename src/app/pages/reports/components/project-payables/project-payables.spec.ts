import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectPayables } from './project-payables';

describe('ProjectPayables', () => {
  let component: ProjectPayables;
  let fixture: ComponentFixture<ProjectPayables>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectPayables]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectPayables);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
