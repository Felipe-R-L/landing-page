// src/app/app.routes.ts (CORRIGIDO)
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '', // Raiz carrega a Intro
    loadComponent: () =>
      import('./pages/intro/intro.component').then((m) => m.IntroComponent),
    pathMatch: 'full', // Garante que só corresponde ao path vazio exato
  },
  {
    path: 'projects', // Rota /projects carrega Layout -> Projects
    loadComponent: () =>
      import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      // A rota filha vazia DENTRO de /projects carrega o componente
      {
        path: '',
        loadComponent: () =>
          import('./pages/projects/projects.component').then(
            (m) => m.ProjectsComponent
          ),
      },
    ],
  },
  {
    path: 'about', // Rota /about carrega Layout -> About
    loadComponent: () =>
      import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      // A rota filha vazia DENTRO de /about carrega o componente
      {
        path: '',
        loadComponent: () =>
          import('./pages/about/about.component').then((m) => m.AboutComponent),
      },
    ],
  },
  // Redireciona qualquer outra rota inválida para a Intro
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
