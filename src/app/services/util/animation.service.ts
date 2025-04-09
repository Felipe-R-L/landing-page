import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AnimationService {
  // Subject para disparar o início do hyperspace
  private hyperspaceTriggerSource = new Subject<void>();
  // Observable público que os componentes vão "ouvir" (com o '$' no final por convenção)
  hyperspaceTrigger$ = this.hyperspaceTriggerSource.asObservable(); // <<< VERIFIQUE ESTA LINHA

  // Subject para notificar o fim do hyperspace (opcional)
  private hyperspaceCompleteSource = new Subject<void>();
  // Observable público para o fim
  hyperspaceComplete$ = this.hyperspaceCompleteSource.asObservable();

  constructor() {}

  // Método chamado pelo HeroComponent para iniciar
  triggerHyperspace(): void {
    this.hyperspaceTriggerSource.next();
  }

  // Método chamado pelo StarfieldComponent para notificar o fim <<< VERIFIQUE ESTE MÉTODO
  notifyHyperspaceComplete(): void {
    this.hyperspaceCompleteSource.next();
  }
}
