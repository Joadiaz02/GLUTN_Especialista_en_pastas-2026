import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgControl } from '@angular/forms';

import { DniFormat } from './dni-format';

describe('DniFormat', () => {
  it('should create an instance', () => {
    const el = new ElementRef(
      document.createElement('ion-input') as HTMLIonInputElement
    );
    const ngControl = { control: null } as unknown as NgControl;

    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: el },
        { provide: NgControl, useValue: ngControl },
      ],
    });

    const directive = TestBed.runInInjectionContext(() => new DniFormat());

    expect(directive).toBeTruthy();
  });
});
