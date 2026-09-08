import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DesignSystemPage } from './design-system.page';

describe('DesignSystemPage', () => {
  let component: DesignSystemPage;
  let fixture: ComponentFixture<DesignSystemPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DesignSystemPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
