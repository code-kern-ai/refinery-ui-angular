import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelingTasksComponent } from './labeling-tasks.component';

describe('LabelingTasksComponent', () => {
  let component: LabelingTasksComponent;
  let fixture: ComponentFixture<LabelingTasksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LabelingTasksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelingTasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
