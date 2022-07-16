import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZeroShotDetailsComponent } from './zero-shot-details.component';

describe('ZeroShotDetailsComponent', () => {
  let component: ZeroShotDetailsComponent;
  let fixture: ComponentFixture<ZeroShotDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ZeroShotDetailsComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ZeroShotDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
