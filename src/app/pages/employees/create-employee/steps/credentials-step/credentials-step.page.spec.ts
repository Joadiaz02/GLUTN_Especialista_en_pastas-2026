import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';

import { CredentialsStepPage } from './credentials-step.page';

describe('CredentialsStepPage', () => {
  let component: CredentialsStepPage;
  let fixture: ComponentFixture<CredentialsStepPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CredentialsStepPage);
    fixture.componentRef.setInput(
      'control',
      new FormGroup({
        email: new FormControl(''),
        password: new FormControl(''),
        confirmPassword: new FormControl(''),
      })
    );
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
