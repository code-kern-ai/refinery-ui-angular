import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GatesIntegratorComponent } from './gates-integrator.component';

describe('GatesIntegratorComponent', () => {
  let component: GatesIntegratorComponent;
  let fixture: ComponentFixture<GatesIntegratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GatesIntegratorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GatesIntegratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
