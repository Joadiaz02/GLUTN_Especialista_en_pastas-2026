import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';

import { PersonalStepPage } from './personal-step.page';

describe('PersonalStepPage', () => {
  let component: PersonalStepPage;
  let fixture: ComponentFixture<PersonalStepPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PersonalStepPage);
    fixture.componentRef.setInput(
      'control',
      new FormGroup({
        name: new FormControl(''),
        lastName: new FormControl(''),
        cuil: new FormControl(''),
        dni: new FormControl(''),
      })
    );
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
