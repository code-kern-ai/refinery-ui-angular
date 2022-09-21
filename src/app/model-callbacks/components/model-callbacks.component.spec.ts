import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelCallbackComponent } from './model-callbacks.component';

describe('ModelCallbackComponent', () => {
  let component: ModelCallbackComponent;
  let fixture: ComponentFixture<ModelCallbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModelCallbackComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModelCallbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
