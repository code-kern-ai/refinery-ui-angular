import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelingSuiteComponent } from './labeling-suite.component';

describe('LabelingSuiteComponent', () => {
  let component: LabelingSuiteComponent;
  let fixture: ComponentFixture<LabelingSuiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LabelingSuiteComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelingSuiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
