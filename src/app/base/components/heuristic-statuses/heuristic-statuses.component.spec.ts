import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeuristicStatusesComponent } from './heuristic-statuses.component';

describe('HeuristicStatusesComponent', () => {
  let component: HeuristicStatusesComponent;
  let fixture: ComponentFixture<HeuristicStatusesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HeuristicStatusesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeuristicStatusesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
