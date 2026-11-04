import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { CuilFormat } from './cuil-format';

// la directiva necesita un campo con formControl
@Component({
  imports: [ReactiveFormsModule, CuilFormat],
  template: '<input [formControl]="cuil" appCuilFormat />',
})
class AnfitrionCuilComponent {
  cuil = new FormControl('');
}

describe('CuilFormat', () => {
  it('should create an instance', () => {
    const fixture = TestBed.createComponent(AnfitrionCuilComponent);
    fixture.detectChanges();

    const directive = fixture.debugElement
      .query(By.directive(CuilFormat))
      .injector.get(CuilFormat);

    expect(directive).toBeTruthy();
  });
});
