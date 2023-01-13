import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordDisplayComponent } from './record-display.component';

describe('RecordDisplayComponent', () => {
  let component: RecordDisplayComponent;
  let fixture: ComponentFixture<RecordDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecordDisplayComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RecordDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
