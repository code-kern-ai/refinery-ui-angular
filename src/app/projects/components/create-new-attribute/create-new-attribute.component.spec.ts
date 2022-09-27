import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateNewAttributeComponent } from './create-new-attribute.component';

describe('CreateNewAttributeComponent', () => {
  let component: CreateNewAttributeComponent;
  let fixture: ComponentFixture<CreateNewAttributeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateNewAttributeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateNewAttributeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
