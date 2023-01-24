import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataSchemaComponent } from './data-schema.component';

describe('DataSchemaComponent', () => {
  let component: DataSchemaComponent;
  let fixture: ComponentFixture<DataSchemaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataSchemaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DataSchemaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
