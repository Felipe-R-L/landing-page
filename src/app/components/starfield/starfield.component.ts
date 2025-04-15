import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  NgZone,
  ChangeDetectionStrategy,
  HostListener,
  inject,
} from '@angular/core';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { AnimationService } from '../../services/util/animation.service'; // Ajuste o caminho
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Funções de Easing
const easeInQuart = (t: number): number => t * t * t * t;
const easeOutQuad = (t: number): number => t * (2 - t);
const easeInQuad = (t: number): number => t * t;
const linear = (t: number): number => t;

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
  private starLines!: THREE.LineSegments;
  private starVertices: number[] = [];
  private starVelocities: { x: number; y: number; z: number }[] = [];
  private clock = new THREE.Clock();
  private frameId: number | null = null;

  // Estados
  private hyperspaceActive = false;
  private hyperspaceProgress = 0;
  private isWarmingUp = true;
  private warmupProgress = 0;

  // Configurações (Versão estável com aceleração rápida)
  private hyperspaceDuration = 2.5; // Duração total do hyperspace
  private hyperspaceStretchPhaseEnd = 0.85; // Mais tempo esticando, menos acelerando
  private warmupDuration = 2.5;
  private cameraNearPlane = 0.1;
  private cameraFarPlane = 1000;
  private useLogarithmicDepthBuffer = false; // Mantido desabilitado
  private initialFov = 60;
  private hyperspaceFovIncrease = 60;
  private baseLineLengthFactor = 0.02;
  private hyperspaceLineLengthFactor = 1.5;
  private hyperspaceMaxSpeedFactor = 250;
  private desiredLineWidth = 1;
  private initialZNear = -10;
  private initialZFar = -200;
  private starMinRadius = 100;
  private starMaxRadius = 750;
  private starRepositionDepthFactor = 0.95;
  private starRepositionVariance = 100;
  private galaxyTexturePath = '/textures/galaxy.exr'; // CONFIRME O CAMINHO
  private toneMappingExposure = 3;

  private animationService = inject(AnimationService);
  private destroy$ = new Subject<void>();

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.initThree();
    this.createGalaxyBackground();
    this.createStars();
    this.startRenderingLoop();

    // ** NOVO/VERIFICADO: Escuta o trigger do hyperspace **
    this.animationService.hyperspaceTrigger$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isWarmingUp && !this.hyperspaceActive) {
          this.startHyperspace();
        }
      });
  }

  ngOnDestroy(): void {
    this.stopRenderingLoop();
    this.destroy$.next();
    this.destroy$.complete();
    // ... (limpeza de renderer, scene, etc. como antes) ...
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.starVertices = [];
    this.starVelocities = [];
  }

  private disposeSingleMaterialTextures(material: THREE.Material): void {
    (Object.keys(material) as (keyof THREE.Material)[]).forEach((key) => {
      const v = (material as any)[key];
      if (v instanceof THREE.Texture) v.dispose();
    });
    material.dispose();
  }

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  private initThree(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.initialFov,
      this.getAspectRatio(),
      this.cameraNearPlane,
      this.cameraFarPlane
    );
    this.camera.position.z = 0;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      logarithmicDepthBuffer: this.useLogarithmicDepthBuffer,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.toneMappingExposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  private getAspectRatio(): number {
    if (!this.canvasRef?.nativeElement) return 1;
    const h = this.canvas.clientHeight;
    return h === 0 ? 1 : this.canvas.clientWidth / h;
  }

  private createGalaxyBackground(): void {
    if (!this.galaxyTexturePath) return;
    const loader = new EXRLoader();
    loader.load(
      this.galaxyTexturePath,
      (t) => {
        t.mapping = THREE.EquirectangularReflectionMapping;
        if (this.scene) {
          this.scene.background = t;
          this.scene.environment = t;
        } else t.dispose();
      },
      undefined,
      (e) => {
        console.error('Starfield EXR Error:', e);
        if (this.scene) this.scene.background = new THREE.Color(0x000005);
      }
    );
  }

  private getRandomPositionInRing(
    minR: number,
    maxR: number
  ): { x: number; y: number } {
    const a = Math.random() * Math.PI * 2;
    const r = THREE.MathUtils.randFloat(minR, maxR);
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  }

  private createStars(): void {
    const starCount = 5000;
    const geom = new THREE.BufferGeometry();
    this.starVertices = [];
    this.starVelocities = [];
    const zF = this.initialZFar;
    const zN = this.initialZNear;
    for (let i = 0; i < starCount; i++) {
      const { x, y } = this.getRandomPositionInRing(
        this.starMinRadius,
        this.starMaxRadius
      );
      const z = THREE.MathUtils.randFloat(zF, zN);
      this.starVertices.push(x, y, z, x, y, z);
      const vZ = THREE.MathUtils.randFloat(15.0, 45.0);
      this.starVelocities.push({ x: 0, y: 0, z: vZ });
    }
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(this.starVertices, 3)
    );
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      linewidth: this.desiredLineWidth,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.starLines = new THREE.LineSegments(geom, mat);
    if (this.scene) this.scene.add(this.starLines);
  }

  private updateStars(deltaTime: number): void {
    if (
      !this.starLines?.geometry?.attributes['position'] ||
      !this.starLines.material ||
      !this.camera
    )
      return;
    const pos = (
      this.starLines.geometry.attributes['position'] as THREE.BufferAttribute
    ).array as Float32Array;
    const mat = this.starLines.material as THREE.LineBasicMaterial;
    let wpMult = 1.0;
    if (this.isWarmingUp) {
      this.warmupProgress += deltaTime / this.warmupDuration;
      this.warmupProgress = Math.min(this.warmupProgress, 1.0);
      wpMult = easeInQuart(this.warmupProgress);
      if (this.warmupProgress >= 1.0) this.isWarmingUp = false;
    }
    let speedF = 1.0;
    let lenF = this.baseLineLengthFactor;
    let fovUpd = false;
    if (this.hyperspaceActive) {
      this.hyperspaceProgress += deltaTime / this.hyperspaceDuration;
      this.hyperspaceProgress = Math.min(this.hyperspaceProgress, 1.0);
      if (this.hyperspaceProgress <= this.hyperspaceStretchPhaseEnd) {
        const strP = this.hyperspaceProgress / this.hyperspaceStretchPhaseEnd;
        lenF =
          this.baseLineLengthFactor +
          linear(strP) *
            (this.hyperspaceLineLengthFactor - this.baseLineLengthFactor);
        mat.opacity = 0.7 - linear(strP) * 0.2;
        speedF = 1.0;
        if (this.camera.fov !== this.initialFov) {
          this.camera.fov = this.initialFov;
          fovUpd = true;
        }
      } else {
        const accP =
          (this.hyperspaceProgress - this.hyperspaceStretchPhaseEnd) /
          (1.0 - this.hyperspaceStretchPhaseEnd);
        lenF = this.hyperspaceLineLengthFactor;
        speedF = 1.0 + easeInQuad(accP) * (this.hyperspaceMaxSpeedFactor - 1.0);
        this.camera.fov =
          this.initialFov + easeInQuad(accP) * this.hyperspaceFovIncrease;
        fovUpd = true;
        mat.opacity = 0.5 + easeInQuad(accP) * 0.3;
      }
      if (this.hyperspaceProgress >= 1.0) {
        this.hyperspaceActive = false;
        console.log('Starfield: Hyperspace animation finished.');
        this.animationService.notifyHyperspaceComplete(); /* <-- ** NOTIFICA CONCLUSÃO ** */
      }
    } else if (!this.isWarmingUp && this.camera.fov > this.initialFov) {
      const dF = Math.exp(-deltaTime * 3.0);
      this.camera.fov =
        this.initialFov + (this.camera.fov - this.initialFov) * dF;
      fovUpd = true;
      mat.opacity = 0.7 + (mat.opacity - 0.7) * dF;
      lenF =
        this.baseLineLengthFactor + (lenF - this.baseLineLengthFactor) * dF;
      if (this.camera.fov - this.initialFov < 0.1) this.resetHyperspaceState();
    } else {
      mat.opacity = 0.7;
    }
    if (fovUpd) this.camera.updateProjectionMatrix();
    const nV = pos.length;
    const rZ = this.camera.position.z - this.starRepositionDepthFactor;
    for (let i = 0; i < nV; i += 6) {
      const v = this.starVelocities[i / 6];
      const bS = v.z * deltaTime * speedF;
      const bL = v.z * lenF;
      const fS = bS * wpMult;
      const fL = bL * wpMult;
      pos[i + 5] += fS;
      pos[i + 2] = pos[i + 5] - fL;
      pos[i] = pos[i + 3];
      pos[i + 1] = pos[i + 4];
      if (pos[i + 5] > rZ) {
        const { x: nX, y: nY } = this.getRandomPositionInRing(
          this.starMinRadius,
          this.starMaxRadius
        );
        const nZ =
          this.initialZFar -
          THREE.MathUtils.randFloat(0, this.starRepositionVariance);
        pos[i + 3] = nX;
        pos[i + 4] = nY;
        pos[i + 5] = nZ;
        pos[i] = nX;
        pos[i + 1] = nY;
        pos[i + 2] = nZ;
      }
    }
    (
      this.starLines.geometry.attributes['position'] as THREE.BufferAttribute
    ).needsUpdate = true;
  }

  private startRenderingLoop(): void {
    this.ngZone.runOutsideAngular(() => {
      this.clock.getDelta();
      const loop = () => {
        this.frameId = requestAnimationFrame(loop);
        const dt = Math.min(this.clock.getDelta(), 0.05);
        if (this.renderer && this.scene && this.camera) {
          this.updateStars(dt);
          this.renderer.render(this.scene, this.camera);
        } else {
          this.stopRenderingLoop();
        }
      };
      loop();
    });
  }
  private stopRenderingLoop(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
  private startHyperspace(): void {
    console.log('Starfield: Starting hyperspace sequence!');
    this.hyperspaceActive = true;
    this.hyperspaceProgress = 0;
    this.clock.getDelta();
  }
  private resetHyperspaceState(): void {
    console.log('Starfield: Resetting state.');
    this.hyperspaceActive = false;
    this.hyperspaceProgress = 0;
    if (this.camera) {
      this.camera.fov = this.initialFov;
      this.camera.updateProjectionMatrix();
    }
    if (this.starLines?.material)
      (this.starLines.material as THREE.LineBasicMaterial).opacity = 0.7;
  }
  @HostListener('window:resize', ['$event']) onWindowResize(): void {
    if (this.camera && this.renderer && this.canvas) {
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (w > 0 && h > 0) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
    }
  }
}
