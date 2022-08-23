import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelDownloadComponentComponent } from './model-download-component.component';

describe('ModelDownloadComponentComponent', () => {
  let component: ModelDownloadComponentComponent;
  let fixture: ComponentFixture<ModelDownloadComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModelDownloadComponentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModelDownloadComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
