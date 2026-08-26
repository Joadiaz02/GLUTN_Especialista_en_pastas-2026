import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CredentialsStepPage } from './credentials-step.page';

describe('CredentialsStepPage', () => {
  let component: CredentialsStepPage;
  let fixture: ComponentFixture<CredentialsStepPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CredentialsStepPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
