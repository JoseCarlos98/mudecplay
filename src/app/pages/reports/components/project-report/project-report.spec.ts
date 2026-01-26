import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectReport } from './project-report';

describe('ProjectReport', () => {
  let component: ProjectReport;
  let fixture: ComponentFixture<ProjectReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
