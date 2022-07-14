import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnakeComponent } from './snake.component';

describe('LoadingComponent', () => {
  let component: SnakeComponent;
  let fixture: ComponentFixture<SnakeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SnakeComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SnakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
