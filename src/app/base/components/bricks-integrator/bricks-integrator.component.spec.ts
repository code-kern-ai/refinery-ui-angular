import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BricksIntegratorComponent } from './bricks-integrator.component';

describe('DropdownItComponent', () => {
  let component: BricksIntegratorComponent;
  let fixture: ComponentFixture<BricksIntegratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BricksIntegratorComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BricksIntegratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
