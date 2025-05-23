// src/app/pages/about/about.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { AnimationService } from '../../services/util/animation.service'; // Ajuste o caminho
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';

// ** NOVO: Definindo a Interface para os links sociais **
interface SocialLink {
  name: string;
  url: string;
  iconClass: string;
  ariaLabel: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, ButtonModule, ChipModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  animations: [
    trigger('contentFade', [
      state('hidden', style({ opacity: 0, transform: 'translateY(30px)' })),
      state('visible', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('hidden => visible', [animate('800ms ease-in')]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent implements OnInit, OnDestroy {
  contentState: 'hidden' | 'visible' = 'hidden';
  profileImageUrl: string = 'assets/images/profile_placeholder.png'; // SUBSTITUA

  socialLinks: SocialLink[] = [
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/felipe-rodrigues-leone/',
      iconClass: $localize`pi pi-linkedin`,
      ariaLabel: $localize`Meu perfil no LinkedIn`,
    },
    {
      name: 'GitHub',
      url: 'https://github.com/Felipe-R-L',
      iconClass: $localize`pi pi-github`,
      ariaLabel: $localize`Meus repositórios no GitHub`,
    },
    {
      name: 'Twitter',
      url: `https://x.com/RFelipe_jpg`,
      iconClass: $localize`pi pi-twitter`,
      ariaLabel: $localize`Meu perfil no Twitter/X`,
    },
  ];

  private animationService = inject(AnimationService);
  private cdRef = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private receivedHyperspaceComplete = false;

  constructor() {}

  ngOnInit(): void {
    this.receivedHyperspaceComplete = false;
    this.animationService.hyperspaceComplete$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.receivedHyperspaceComplete = true;
        this.contentState = 'visible';
        this.cdRef.detectChanges();
      });
    setTimeout(() => {
      if (!this.receivedHyperspaceComplete && this.contentState === 'hidden') {
        this.contentState = 'visible';
        this.cdRef.detectChanges();
      }
    }, 0);
  }

  navigateToNextAnimated(route: string): void {
    this.animationService.requestAnimatedNavigation(route);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
