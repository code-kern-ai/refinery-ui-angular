import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownIterativeComponent } from './dropdown-iterative.component';

describe('DropdownIterativeComponent', () => {
  let component: DropdownIterativeComponent;
  let fixture: ComponentFixture<DropdownIterativeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DropdownIterativeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DropdownIterativeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
