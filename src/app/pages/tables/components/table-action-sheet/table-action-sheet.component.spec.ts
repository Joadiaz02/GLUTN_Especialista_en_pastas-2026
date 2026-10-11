import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableActionSheetComponent } from './table-action-sheet.component';

describe('TableActionSheetComponent', () => {
  let component: TableActionSheetComponent;
  let fixture: ComponentFixture<TableActionSheetComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TableActionSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
