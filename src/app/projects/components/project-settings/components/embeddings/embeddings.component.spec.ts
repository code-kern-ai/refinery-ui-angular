import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmbeddingsComponent } from './embeddings.component';

describe('EmbeddingsComponent', () => {
  let component: EmbeddingsComponent;
  let fixture: ComponentFixture<EmbeddingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmbeddingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmbeddingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
