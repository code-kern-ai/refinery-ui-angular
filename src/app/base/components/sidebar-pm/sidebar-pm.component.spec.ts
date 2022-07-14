import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarPmComponent } from './sidebar-pm.component';

describe('SidebarPmComponent', () => {
  let component: SidebarPmComponent;
  let fixture: ComponentFixture<SidebarPmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SidebarPmComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarPmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
