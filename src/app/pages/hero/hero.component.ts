import { TypingFXComponent } from './../../components/typing-fx/typing-fx.component';
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CommonModule, NgIf } from '@angular/common';
// --- Importações de Animação ---
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { AnimationService } from '../../services/util/animation.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, NgIf, ButtonModule, TypingFXComponent],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // --- Adicionar metadados de animações ---
  animations: [
    trigger('fadeInOut', [
      // Estado 'void' (quando *ngIf é false) para 'qualquer estado' (quando *ngIf é true)
      transition('void => *', [
        // Animação de entrada (fade-in)
        style({ opacity: 0 }), // Começa invisível
        animate('2000ms ease-in-out', style({ opacity: 1 })), // Anima para visível
      ]),
      // Opcional: Animação de saída (fade-out) se você fosse usar *ngIf para esconder novamente
      // transition('* => void', [
      //   animate('500ms ease-in-out', style({ opacity: 0 }))
      // ])
    ]),
  ],
  // --- Fim dos metadados de animações ---
})
export class HeroComponent {
  showCallToAction = false;
  typedIntroText = `[Olá,]{text-3xl md:text-3xl} [sou o Felipe!]{text-3xl md:text-3xl font-semibold}
[Seja bem-vindo ao meu Portfólio.]{text-lg md:text-3xl text-gray-400}`;
  sloganLine1 = 'Think(fast);';
  sloganLine2 = 'Deploy(faster);';
  sloganDescription =
    'Construa qualquer coisa que você imaginar, sem se preocupar com a implementação.';
  ctaButtonLabel = 'Ver meus projetos';

  constructor(
    private cdr: ChangeDetectorRef,
    private animationService: AnimationService
  ) {}

  onTypingComplete(): void {
    console.log('Typing complete, showing CTA button.');
    this.showCallToAction = true;
    this.cdr.markForCheck();
  }

  scrollToPortfolio(): void {
    console.log('Scroll button clicked.');
    const portfolioSection = document.getElementById('portfolio');
    console.log('Found element:', portfolioSection);
    if (portfolioSection) {
      portfolioSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      console.warn('Element with ID "portfolio" not found!');
    }
  }
  triggerHyperspaceEffect(): void {
    console.log('CTA Button clicked - Triggering Hyperspace via Service');
    // --->>> ESTA LINHA CHAMA O SERVIÇO <<<---
    this.animationService.triggerHyperspace();
  }
}
