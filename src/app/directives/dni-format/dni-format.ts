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

@Directive({
  selector: '[appDniFormat]',
})
export class DniFormat implements OnInit, OnDestroy {
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

    const digitsOnly = rawValue.replace(/\D/g, '').slice(0, 8);

    this.ngControl.control?.setValue(digitsOnly, { emitEvent: false });

    const formatted = this.formatDni(digitsOnly);

    input.value = formatted;
  }

  private updateDisplayValue(value: unknown): void {
    const digitsOnly = (value ?? '').toString().replace(/\D/g, '').slice(0, 8);
    const formatted = this.formatDni(digitsOnly);

    this.el.nativeElement.value = formatted;
  }

  private formatDni(value: string): string {
    if (!value) return '';

    const reversed = value.split('').reverse().join('');
    const chunks = reversed.match(/.{1,3}/g) ?? [];

    return chunks.join('.').split('').reverse().join('');
  }
}
