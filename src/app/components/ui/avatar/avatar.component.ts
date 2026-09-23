import { CommonModule } from '@angular/common';
import { AfterContentInit, Component, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  imports: [CommonModule],
})
export class AvatarComponent implements AfterContentInit {
  image = input<string | null>('');

  fallback = input<string | undefined>(undefined);

  shape = input<'circle' | 'square'>('circle');

  size = input<'sm' | 'md' | 'lg'>('md');

  hasImageError = false;

  classes = '';

  ngAfterContentInit(): void {
    this.classes = this.getStyleClass();
  }

  getStyleClass() {
    const styleClass: string[] = ['avatar'];

    if (this.shape) {
      styleClass.push(`avatar--${this.shape()}`);
    }

    if (this.size) {
      styleClass.push(`avatar--${this.size()}`);
    }

    return styleClass.join(' ');
  }

  onLoad(): void {
    this.hasImageError = false;
  }

  onError(): void {
    this.hasImageError = true;
  }
}
