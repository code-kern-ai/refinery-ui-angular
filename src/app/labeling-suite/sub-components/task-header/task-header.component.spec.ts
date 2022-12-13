import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelingSuiteTaskHeaderComponent } from './task-header.component';

describe('LabelingSuiteTaskHeaderComponent', () => {
  let component: LabelingSuiteTaskHeaderComponent;
  let fixture: ComponentFixture<LabelingSuiteTaskHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LabelingSuiteTaskHeaderComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelingSuiteTaskHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
