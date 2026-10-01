import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignedTablePage } from './assigned-table.page';

describe('AssignedTablePage', () => {
  let component: AssignedTablePage;
  let fixture: ComponentFixture<AssignedTablePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignedTablePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
