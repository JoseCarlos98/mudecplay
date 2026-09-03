import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAllReport } from './project-all-report';

describe('ProjectAllReport', () => {
  let component: ProjectAllReport;
  let fixture: ComponentFixture<ProjectAllReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectAllReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectAllReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
