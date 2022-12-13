import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelingSuiteOverviewTableComponent } from './overview-table.component';

describe('LabelingSuiteOverviewTableComponent', () => {
  let component: LabelingSuiteOverviewTableComponent;
  let fixture: ComponentFixture<LabelingSuiteOverviewTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LabelingSuiteOverviewTableComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelingSuiteOverviewTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
