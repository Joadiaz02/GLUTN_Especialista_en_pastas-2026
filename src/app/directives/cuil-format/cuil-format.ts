import {
  Directive,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

const CUIL_MAX_DIGITS = 11;

@Directive({
  selector: '[appCuilFormat]',
})
export class CuilFormat implements OnInit, OnDestroy {
  private el = inject<ElementRef<HTMLIonInputElement>>(ElementRef);
  private ngControl = inject(NgControl);

  private subscription?: Subscription;

  ngOnInit(): void {
    this.updateDisplayValue(this.ngControl.control?.value);

    this.subscription = this.ngControl.control?.valueChanges.subscribe(
      (value) => {
        this.updateDisplayValue(value);
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  @HostListener('ionInput', ['$event'])
  onIonInput(event: Event) {
    const input = event.target as HTMLIonInputElement;
    const rawValue: string = (input.value ?? '').toString();

    const digitsOnly = rawValue.replace(/\D/g, '').slice(0, CUIL_MAX_DIGITS);

    this.ngControl.control?.setValue(digitsOnly, { emitEvent: false });

    input.value = this.formatCuil(digitsOnly);
  }

  private updateDisplayValue(value: unknown): void {
    const digitsOnly = (value ?? '')
      .toString()
      .replace(/\D/g, '')
      .slice(0, CUIL_MAX_DIGITS);

    this.el.nativeElement.value = this.formatCuil(digitsOnly);
  }

  private formatCuil(digits: string): string {
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;

    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  }
}