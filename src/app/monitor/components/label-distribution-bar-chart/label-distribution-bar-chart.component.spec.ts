import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelDistributionBarChartComponent } from './label-distribution-bar-chart.component';

describe('LabelDistributionBarChartComponent', () => {
  let component: LabelDistributionBarChartComponent;
  let fixture: ComponentFixture<LabelDistributionBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LabelDistributionBarChartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelDistributionBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
