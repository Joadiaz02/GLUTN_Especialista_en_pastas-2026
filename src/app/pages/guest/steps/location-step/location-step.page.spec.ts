import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocationStepPage } from './location-step.page';

describe('LocationStepPage', () => {
  let component: LocationStepPage;
  let fixture: ComponentFixture<LocationStepPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LocationStepPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
