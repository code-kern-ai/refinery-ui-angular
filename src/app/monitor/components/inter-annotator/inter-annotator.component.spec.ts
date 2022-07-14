import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterAnnotatorComponent } from './inter-annotator.component';

describe('ConfusionHeatmapComponent', () => {
  let component: InterAnnotatorComponent;
  let fixture: ComponentFixture<InterAnnotatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InterAnnotatorComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InterAnnotatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
