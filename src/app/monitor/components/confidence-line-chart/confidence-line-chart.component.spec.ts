import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfidenceLineChartComponent } from './confidence-line-chart.component';

describe('ConfidenceLineChartComponent', () => {
  let component: ConfidenceLineChartComponent;
  let fixture: ComponentFixture<ConfidenceLineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConfidenceLineChartComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfidenceLineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
