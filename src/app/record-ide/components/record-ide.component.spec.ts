import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordIDEComponent } from './record-ide.component';

describe('RecordIDEComponent', () => {
  let component: RecordIDEComponent;
  let fixture: ComponentFixture<RecordIDEComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RecordIDEComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RecordIDEComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
