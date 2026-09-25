import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectClassificationReport } from './project-classification-report';

describe('ProjectClassificationReport', () => {
  let component: ProjectClassificationReport;
  let fixture: ComponentFixture<ProjectClassificationReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectClassificationReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectClassificationReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
