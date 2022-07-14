import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeakSupervisionComponent } from './weak-supervision.component';

describe('WeakSupervisionComponent', () => {
  let component: WeakSupervisionComponent;
  let fixture: ComponentFixture<WeakSupervisionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WeakSupervisionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WeakSupervisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
