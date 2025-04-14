// src/app/pages/projects/projects.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  trigger,
  state,
  style,
  animate,
  transition,
  AnimationEvent,
} from '@angular/animations';
import { AnimationService } from '../../services/util/animation.service';
import { Subject, Subscription } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

// Importe Módulos PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip'; // <<--- IMPORTAR TOOLTIPMODULE

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    ChipModule,
    TooltipModule, // <<--- ADICIONAR AOS IMPORTS
  ],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css'],
  animations: [
    trigger('portfolioFade', [
      state('hidden', style({ opacity: 0, transform: 'translateY(30px)' })),
      state('visible', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('hidden => visible', [animate('800ms ease-in')]),
      transition('visible => hidden', [animate('500ms ease-out')]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsComponent implements OnInit, OnDestroy {
  // ... (Restante do seu código TS como estava antes) ...

  portfolioState: 'hidden' | 'visible' = 'hidden';
  isTransitioning = false;

  private animationService = inject(AnimationService);
  private router = inject(Router);
  private cdRef = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private receivedHyperspaceComplete = false;
  private hyperspaceCompleteSub: Subscription | null = null;
  private nextRoute: string | null = null;

  constructor() {}

  ngOnInit(): void {
    this.receivedHyperspaceComplete = false;
    this.animationService.hyperspaceComplete$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (
          !this.receivedHyperspaceComplete &&
          this.portfolioState === 'hidden'
        ) {
          this.receivedHyperspaceComplete = true;
          this.portfolioState = 'visible';
          this.cdRef.detectChanges();
        }
      });
    setTimeout(() => {
      if (
        !this.receivedHyperspaceComplete &&
        this.portfolioState === 'hidden'
      ) {
        this.portfolioState = 'visible';
        this.cdRef.detectChanges();
      }
    }, 0);
  }

  startAnimatedNav(targetRoute: string): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.nextRoute = targetRoute;
    this.portfolioState = 'hidden';
    this.cdRef.detectChanges();
  }

  onFadeOutDone(event: AnimationEvent): void {
    // @ts-ignore
    if (
      event.toState === 'hidden' &&
      event.phaseName === 'done' &&
      this.isTransitioning &&
      this.nextRoute
    ) {
      this.animationService.triggerHyperspace();
      this.hyperspaceCompleteSub = this.animationService.hyperspaceComplete$
        .pipe(take(1), takeUntil(this.destroy$))
        .subscribe(() => {
          this.router.navigate([this.nextRoute!]);
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
