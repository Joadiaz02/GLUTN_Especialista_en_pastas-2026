import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';

import { ProfileStepPage } from './profile-step.page';

describe('ProfileStepPage', () => {
  let component: ProfileStepPage;
  let fixture: ComponentFixture<ProfileStepPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileStepPage);
    fixture.componentRef.setInput('control', new FormGroup({}));
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
