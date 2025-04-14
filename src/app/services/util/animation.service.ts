// src/app/services/util/animation.service.ts
import { Injectable, inject } from '@angular/core'; // inject adicionado
import { Subject } from 'rxjs';
import { Router } from '@angular/router'; // Router importado

@Injectable({
  providedIn: 'root',
})
export class AnimationService {
  private hyperspaceTriggerSource = new Subject<void>();
  hyperspaceTrigger$ = this.hyperspaceTriggerSource.asObservable();

  private hyperspaceCompleteSource = new Subject<void>();
  hyperspaceComplete$ = this.hyperspaceCompleteSource.asObservable();

  // Não precisamos mais de um Subject para request, vamos navegar direto
  // private animatedNavigationRequestSource = new Subject<string>();
  // animatedNavigationRequest$ = this.animatedNavigationRequestSource.asObservable();

  private router = inject(Router); // Injeta o Router

  constructor() {}

  triggerHyperspace(): void {
    // Dispara o hyperspace (chamado pela IntroComponent)
    console.log('AnimationService: Hyperspace triggered');
    this.hyperspaceTriggerSource.next();
  }

  notifyHyperspaceComplete(): void {
    // Avisa que o hyperspace terminou (chamado pelo StarfieldComponent)
    console.log('AnimationService: Hyperspace notified as complete');
    this.hyperspaceCompleteSource.next();
  }

  // ** NOVO: Método chamado pelos botões "Próxima Página Animada" **
  requestAnimatedNavigation(targetRoute: string): void {
    console.log(
      `AnimationService: Requesting animated navigation TO ${targetRoute} VIA Intro`
    );
    // Navega para a IntroComponent (rota '/') passando a rota final e um flag
    this.router.navigate(['/'], {
      state: { targetRoute: targetRoute, animated: true },
    });
    // A IntroComponent vai detectar esse 'state' e iniciar a sequência
  }
}
