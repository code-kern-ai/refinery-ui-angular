import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrowdLabelerDetailsComponent } from './crowd-labeler-details.component';

describe('ZeroShotDetailsComponent', () => {
  let component: CrowdLabelerDetailsComponent;
  let fixture: ComponentFixture<CrowdLabelerDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CrowdLabelerDetailsComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CrowdLabelerDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
