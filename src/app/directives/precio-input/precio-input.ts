import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

/**
 * Campo de precio con decimales.
 * - Acepta coma o punto y guarda siempre con punto (8500.50).
 * - Máximo 2 decimales.
 * - Al salir del campo muestra siempre 2 decimales (8500 -> 8500.00).
 */
@Directive({
  selector: '[appPrecioInput]',
})
export class PrecioInput implements OnInit, OnDestroy {
  private el = inject<ElementRef<HTMLIonInputElement>>(ElementRef);
  private ngControl = inject(NgControl);

  private subscription?: Subscription;

  ngOnInit(): void {
    this.updateDisplayValue(this.ngControl.control?.value);

    this.subscription = this.ngControl.control?.valueChanges.subscribe(
      (value) => this.updateDisplayValue(value)
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  @HostListener('ionInput', ['$event'])
  onIonInput(event: Event): void {
    const input = event.target as HTMLIonInputElement;
    const clean = this.sanitize((input.value ?? '').toString());

    this.ngControl.control?.setValue(clean, { emitEvent: false });

    input.value = clean;
  }

  @HostListener('ionBlur')
  onIonBlur(): void {
    const value = (this.ngControl.control?.value ?? '').toString();

    if (!value) return;

    const number = Number(value);

    if (!Number.isFinite(number)) return;

    // emite el cambio: actualiza el campo y las validaciones
    this.ngControl.control?.setValue(number.toFixed(2));
  }

  private updateDisplayValue(value: unknown): void {
    this.el.nativeElement.value = (value ?? '').toString();
  }

  private sanitize(raw: string): string {
    const normalized = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    const [integer, ...rest] = normalized.split('.');

    if (rest.length === 0) return integer;

    return `${integer}.${rest.join('').slice(0, 2)}`;
  }
}