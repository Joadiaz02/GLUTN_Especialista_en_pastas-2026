import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonalStepPage } from './personal-step.page';

describe('PersonalStepPage', () => {
  let component: PersonalStepPage;
  let fixture: ComponentFixture<PersonalStepPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PersonalStepPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
