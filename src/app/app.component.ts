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
export class AppComponent implements OnInit {
  title = $localize`landing-page`;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    vercelAnalytics();
    injectSpeedInsights();
  }

  ngOnInit(): void {
    // Verifica se está executando no ambiente do navegador
    if (isPlatformBrowser(this.platformId)) {
      this.redirectToCorrectLocale();
    }
  }

  private redirectToCorrectLocale(): void {
    const supportedLocales = ['pt-BR', 'en-US'];
    const defaultLocale = 'pt-BR';
    const localeStorageKey = 'user_preferred_locale';

    const currentPath = window.location.pathname;
    const pathSegments = currentPath
      .split('/')
      .filter((segment) => segment.length > 0);
    const potentialLocale = pathSegments[0];

    if (supportedLocales.includes(potentialLocale)) {
      return;
    }

    let targetLocale = defaultLocale;

    const savedLocale = localStorage.getItem(localeStorageKey);
    if (savedLocale && supportedLocales.includes(savedLocale)) {
      targetLocale = savedLocale;
    } else {
      const browserLang =
        navigator.language || (navigator.languages && navigator.languages[0]);
      if (browserLang) {
        const matchedLocale = supportedLocales.find((locale) =>
          browserLang
            .toLowerCase()
            .startsWith(locale.substring(0, 2).toLowerCase())
        );
        if (matchedLocale) {
          targetLocale = matchedLocale;
        }
      }
    }
    const newPath = `/${targetLocale}${currentPath === '/' ? '' : currentPath}${
      window.location.search
    }${window.location.hash}`;
    window.location.replace(newPath);
  }
}
