// src/app/pages/intro/intro.component.ts
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnDestroy,
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
import { ButtonModule } from 'primeng/button';
import { TypingFXComponent } from '../../components/typing-fx/typing-fx.component';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [CommonModule, ButtonModule, TypingFXComponent],
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.css'],
  animations: [
    trigger('introFade', [
      state('visible', style({ opacity: 1 })),
      state('hidden', style({ opacity: 0 })),
      transition('visible => hidden', [animate('600ms ease-out')]),
    ]),
    trigger('fadeInContent', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '800ms 100ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroComponent implements OnInit, OnDestroy {
  introState: 'visible' | 'hidden' = 'visible';
  showCallToActionContent = false;
  isTransitioning = false;

  private animationService = inject(AnimationService);
  private router = inject(Router);
  private cdRef = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private requestedTargetRoute: string = '/projects'; // Destino padrão é /projects
  private hyperspaceCompleteSub: Subscription | null = null;

  typedIntroText = `[Olá,]{text-3xl md:text-3xl} [sou o Felipe!]{text-3xl md:text-3xl font-semibold} [Seja bem-vindo ao meu Portfólio.]{text-lg md:text-3xl text-gray-400}`;
  sloganLine1 = 'Think(fast);';
  sloganLine2 = 'Deploy(faster);';
  sloganDescription =
    'Construa qualquer coisa que você imaginar, sem se preocupar com a implementação.';
  ctaButtonLabel = 'Iniciar Exploração';

  ngOnInit() {
    const navigationState = history.state;
    // Define a rota destino baseada no state ou usa '/projects' como padrão
    this.requestedTargetRoute = navigationState?.targetRoute || '/projects';

    if (navigationState?.animated === true) {
      this.showCallToActionContent = true;
      this.cdRef.detectChanges();
      setTimeout(() => {
        if (!this.isTransitioning) this.startSequence();
      }, 150);
    } else {
      this.requestedTargetRoute = '/projects'; // Garante destino padrão no load normal
      // this.onTypingComplete(); // Mostra botão direto se não usar typing
    }
  }

  onTypingComplete(): void {
    if (!history.state?.animated) {
      this.showCallToActionContent = true;
      this.cdRef.detectChanges();
    }
  }

  startSequence(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.introState = 'hidden';
    this.cdRef.detectChanges();
  }

  onIntroFadeOutDone(event: AnimationEvent): void {
    // @ts-ignore
    if (event.toState === 'hidden' && event.phaseName === 'done') {
      setTimeout(() => {
        this.animationService.triggerHyperspace();
        this.hyperspaceCompleteSub = this.animationService.hyperspaceComplete$
          .pipe(take(1), takeUntil(this.destroy$))
          .subscribe(() => {
            this.router.navigate([this.requestedTargetRoute]); // Navega para /projects ou /about
            this.isTransitioning = false;
          });
      }, 700);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
