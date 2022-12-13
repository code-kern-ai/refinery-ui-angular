import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelingSuiteLabelingComponent } from './labeling.component';

describe('LabelingSuiteLabelingComponent', () => {
  let component: LabelingSuiteLabelingComponent;
  let fixture: ComponentFixture<LabelingSuiteLabelingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LabelingSuiteLabelingComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelingSuiteLabelingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
