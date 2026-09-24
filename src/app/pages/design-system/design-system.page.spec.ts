import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { DesignSystemPage } from './design-system.page';

describe('DesignSystemPage', () => {
  let component: DesignSystemPage;
  let fixture: ComponentFixture<DesignSystemPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideIonicAngular()] });
    fixture = TestBed.createComponent(DesignSystemPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
