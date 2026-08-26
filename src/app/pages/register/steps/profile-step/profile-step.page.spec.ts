import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileStepPage } from './profile-step.page';

describe('ProfileStepPage', () => {
  let component: ProfileStepPage;
  let fixture: ComponentFixture<ProfileStepPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileStepPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
