import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KnowledgeBaseDetailsComponent } from './knowledge-base-details.component';

describe('KnowledgeBaseDetailsComponent', () => {
  let component: KnowledgeBaseDetailsComponent;
  let fixture: ComponentFixture<KnowledgeBaseDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KnowledgeBaseDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KnowledgeBaseDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
