import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorizontalGroupedBarChartComponent } from './horizontal-grouped-bar-chart.component';

describe('HorizontalGroupedBarChartComponent', () => {
  let component: HorizontalGroupedBarChartComponent;
  let fixture: ComponentFixture<HorizontalGroupedBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HorizontalGroupedBarChartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HorizontalGroupedBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
