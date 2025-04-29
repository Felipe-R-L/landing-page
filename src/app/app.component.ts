import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { StarfieldComponent } from './components/starfield/starfield.component';
import { inject as vercelAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

injectSpeedInsights();

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, StarfieldComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = $localize`landing-page`;

  constructor() {
    vercelAnalytics();
    injectSpeedInsights();
  }
}
