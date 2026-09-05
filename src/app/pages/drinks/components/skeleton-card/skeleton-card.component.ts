import { Component, OnInit } from '@angular/core';
import { IonSkeletonText } from "@ionic/angular";

@Component({
  selector: 'app-skeleton-card',
  templateUrl: './skeleton-card.component.html',
  styleUrls: ['./skeleton-card.component.scss'],
  imports: [IonSkeletonText],
})
export class SkeletonCardComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
