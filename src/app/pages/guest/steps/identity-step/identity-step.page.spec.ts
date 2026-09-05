import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdentityStepPage } from './identity-step.page';

describe('IdentityStepPage', () => {
  let component: IdentityStepPage;
  let fixture: ComponentFixture<IdentityStepPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IdentityStepPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
