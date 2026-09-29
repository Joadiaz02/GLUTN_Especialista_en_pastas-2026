import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonTitle, IonToolbar, IonButtons, IonContent } from '@ionic/angular';
import { ConfirmVolverComponent } from '@app/components/ui/confirm-volver/confirm-volver.component';
import { Router, RouterLink } from '@angular/router';
import { Waitlist } from '@app/services';

@Component({
  selector: 'app-waitlist',
  templateUrl: './waitlist.page.html',
  styleUrls: ['./waitlist.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    ConfirmVolverComponent,
    IonContent
],
})
export class WaitlistPage {
  private _router = inject(Router);
  private _waitlistService = inject(Waitlist);
  private _unsubscribe: (() => void) | null = null;

  users = signal<any[]>([])

  async ngOnInit() {
    await this._loadList();

    console.log(this.users())

    this._unsubscribe = this._waitlistService.getListChange(() => {
      this._loadList();
    });
  }

  private async _loadList() {
    const users = await this._waitlistService.getList();
  
    this.users.set(users);
  }

  volver(): void {
    void this._router.navigate(['/admin']);
  }

  ngOnDestroy() {
    this._unsubscribe?.();
  }
}
