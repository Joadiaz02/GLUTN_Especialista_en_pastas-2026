import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeActionSheetComponent } from './employee-action-sheet.component';

describe('EmployeeActionSheetComponent', () => {
  let component: EmployeeActionSheetComponent;
  let fixture: ComponentFixture<EmployeeActionSheetComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EmployeeActionSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
