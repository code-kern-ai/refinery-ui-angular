import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CryptedFieldComponent } from './crypted-field.component';

describe('CryptedFieldComponent', () => {
  let component: CryptedFieldComponent;
  let fixture: ComponentFixture<CryptedFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CryptedFieldComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CryptedFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
