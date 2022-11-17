import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelStudioAssistantComponent } from './label-studio-assistant.component';

describe('ModalComponent', () => {
  let component: LabelStudioAssistantComponent;
  let fixture: ComponentFixture<LabelStudioAssistantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LabelStudioAssistantComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelStudioAssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
