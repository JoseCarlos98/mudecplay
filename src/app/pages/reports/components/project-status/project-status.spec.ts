import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectStatus } from './project-status';

describe('ProjectStatus', () => {
  let component: ProjectStatus;
  let fixture: ComponentFixture<ProjectStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
