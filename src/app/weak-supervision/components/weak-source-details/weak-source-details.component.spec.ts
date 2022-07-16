import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeakSourceDetailsComponent } from './weak-source-details.component';

describe('WeakSourceDetailsComponent', () => {
  let component: WeakSourceDetailsComponent;
  let fixture: ComponentFixture<WeakSourceDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WeakSourceDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WeakSourceDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
