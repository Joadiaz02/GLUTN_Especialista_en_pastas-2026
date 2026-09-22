import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';

import { IdentityStepPage } from './identity-step.page';

describe('IdentityStepPage', () => {
  let component: IdentityStepPage;
  let fixture: ComponentFixture<IdentityStepPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IdentityStepPage);
    fixture.componentRef.setInput(
      'control',
      new FormGroup({ fullName: new FormControl('') })
    );
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
