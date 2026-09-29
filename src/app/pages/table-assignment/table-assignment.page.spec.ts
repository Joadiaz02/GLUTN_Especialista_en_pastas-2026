import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableAssignmentPage } from './table-assignment.page';

describe('TableAssignmentPage', () => {
  let component: TableAssignmentPage;
  let fixture: ComponentFixture<TableAssignmentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TableAssignmentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
