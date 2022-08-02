import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownItComponent } from './dropdown-it.component';

describe('DropdownItComponent', () => {
  let component: DropdownItComponent;
  let fixture: ComponentFixture<DropdownItComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DropdownItComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DropdownItComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
