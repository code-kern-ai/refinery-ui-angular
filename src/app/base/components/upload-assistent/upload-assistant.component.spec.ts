import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadAssistantComponent } from './upload-assistant.component';

describe('ModalComponent', () => {
  let component: UploadAssistantComponent;
  let fixture: ComponentFixture<UploadAssistantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UploadAssistantComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadAssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
