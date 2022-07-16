import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfusionHeatmapComponent } from './confusion-heatmap.component';

describe('ConfusionHeatmapComponent', () => {
  let component: ConfusionHeatmapComponent;
  let fixture: ComponentFixture<ConfusionHeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfusionHeatmapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfusionHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
