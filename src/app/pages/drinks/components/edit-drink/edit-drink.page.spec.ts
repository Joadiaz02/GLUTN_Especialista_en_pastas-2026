import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditDrinkPage } from './edit-drink.page';

describe('EditDrinkPage', () => {
  let component: EditDrinkPage;
  let fixture: ComponentFixture<EditDrinkPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditDrinkPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
