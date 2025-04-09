import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  NgZone,
  ChangeDetectionStrategy,
} from '@angular/core';
import * as THREE from 'three';
import { AnimationService } from '../../services/util/animation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-starfield',
  standalone: true,
  imports: [],
  templateUrl: './starfield.component.html',
  styleUrls: ['./starfield.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarfieldComponent implements OnInit, OnDestroy {
  @ViewChild('starfieldCanvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private stars!: THREE.Points;
  private starVertices: number[] = [];
  private starVelocities: { x: number; y: number; z: number }[] = [];
  private clock = new THREE.Clock();

  private frameId: number | null = null;
  private hyperspaceActive = false;
  private hyperspaceProgress = 0;
  private hyperspaceDuration = 2.5;

  private cameraFarPlane = 1000; // Definir o far plane da câmera como uma variável

  private hyperspaceSubscription: Subscription | undefined;

  constructor(
    private ngZone: NgZone,
    private animationService: AnimationService
  ) {}

  ngOnInit(): void {
    this.initThree();
    this.createStars();
    this.startRenderingLoop();

    this.hyperspaceSubscription =
      this.animationService.hyperspaceTrigger$.subscribe(() => {
        this.startHyperspace();
      });
  }

  ngOnDestroy(): void {
    this.stopRenderingLoop();
    this.hyperspaceSubscription?.unsubscribe();
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  private initThree(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.getAspectRatio(),
      1, // Near plane - importante para reposicionamento
      this.cameraFarPlane // Far plane
    );
    // Posição inicial da câmera ligeiramente atrás para ver as estrelas no início
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  private getAspectRatio(): number {
    return this.canvas.clientWidth / this.canvas.clientHeight;
  }

  private createStars(): void {
    const starCount = 15000;
    const geometry = new THREE.BufferGeometry();
    this.starVertices = [];
    this.starVelocities = [];
    const initialSpreadZ = this.cameraFarPlane;

    for (let i = 0; i < starCount; i++) {
      const x = THREE.MathUtils.randFloatSpread(1500);
      const y = THREE.MathUtils.randFloatSpread(1500);
      const z = THREE.MathUtils.randFloat(
        -initialSpreadZ,
        this.camera.position.z - 50
      );

      this.starVertices.push(x, y, z);

      // --- AJUSTE DA VELOCIDADE Z ---
      // Velocidade Z POSITIVA para mover em direção à câmera (+Z)
      const speedZ = THREE.MathUtils.randFloat(5.0, 20.0); // <<< ALTERADO PARA POSITIVO

      this.starVelocities.push({
        x: 0,
        y: 0,
        z: speedZ, // <<< USA A VELOCIDADE POSITIVA
      });
    }
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(this.starVertices, 3)
    );
    // ... (criação do material e Points)
    const material = new THREE.PointsMaterial({
      // Recriando para clareza
      color: 0xffffff,
      size: 0.7,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private updateStars(deltaTime: number): void {
    const positions = this.stars.geometry.attributes['position']
      .array as Float32Array;
    let currentSpeedFactor = 1.0;

    if (this.hyperspaceActive) {
      // ... (lógica do hyperspace para calcular currentSpeedFactor > 1.0)
      this.hyperspaceProgress += deltaTime / this.hyperspaceDuration;
      this.hyperspaceProgress = Math.min(this.hyperspaceProgress, 1);
      currentSpeedFactor = 1.0 + this.hyperspaceProgress * 250; // Fator de velocidade do hyperspace

      // ... (mudanças visuais do hyperspace: material, fov) ...
      const material = this.stars.material as THREE.PointsMaterial;
      material.size = 0.5 + this.hyperspaceProgress * 3;
      material.opacity = 0.8 - this.hyperspaceProgress * 0.5;
      this.camera.fov = 60 + this.hyperspaceProgress * 40;
      this.camera.updateProjectionMatrix();

      if (this.hyperspaceProgress >= 1) {
        // ... (reset do estado pós-hyperspace) ...
        this.hyperspaceActive = false;
        this.hyperspaceProgress = 0;
        console.log('Hyperspace complete!');
        this.animationService.notifyHyperspaceComplete();
        (this.stars.material as THREE.PointsMaterial).size = 0.7;
        (this.stars.material as THREE.PointsMaterial).opacity = 0.8;
        this.camera.fov = 60;
        this.camera.updateProjectionMatrix();
      }
    } else {
      currentSpeedFactor = 1.0; // Garante velocidade normal
    }

    for (let i = 0; i < positions.length; i += 3) {
      const velocity = this.starVelocities[i / 3];

      // Atualiza posição Z usando a velocidade Z (agora POSITIVA)
      positions[i + 2] += velocity.z * deltaTime * currentSpeedFactor; // <<< ESTA SOMA AGORA AUMENTA O Z

      // CONDIÇÃO DE REPOSICIONAMENTO (permanece a mesma):
      // Se a estrela passou da câmera (Z > camera.position.z)
      if (positions[i + 2] > this.camera.position.z) {
        // Reposiciona ela bem longe no fundo (Z negativo grande)
        positions[i] = THREE.MathUtils.randFloatSpread(1500);
        positions[i + 1] = THREE.MathUtils.randFloatSpread(1500);
        // O reposicionamento para Z negativo grande estava correto
        positions[i + 2] =
          -this.cameraFarPlane - THREE.MathUtils.randFloat(0, 500);
      }
    }

    this.stars.geometry.attributes['position'].needsUpdate = true;
  }

  private startRenderingLoop(): void {
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        this.frameId = requestAnimationFrame(loop);
        const deltaTime = this.clock.getDelta();
        this.updateStars(deltaTime);
        this.renderer.render(this.scene, this.camera);
      };
      loop();
    });
  }

  // ... stopRenderingLoop, startHyperspace, onWindowResize ...
  private stopRenderingLoop(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  private startHyperspace(): void {
    if (!this.hyperspaceActive) {
      console.log('Starting hyperspace!');
      this.hyperspaceActive = true;
      this.hyperspaceProgress = 0;
      this.clock.getDelta();
    }
  }

  onWindowResize(): void {
    this.camera.aspect = this.getAspectRatio();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }
}
