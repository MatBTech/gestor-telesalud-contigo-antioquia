import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { cambiosPendientesGuard } from './core/guards/cambios-pendientes.guard';
import { AuthService } from './core/services/auth.service';

// Rutas de la aplicacion.
// Se usa loadComponent (carga diferida): el codigo de cada pantalla se
// descarga solo cuando el usuario entra a ella, asi la carga inicial es
// mas rapida, algo importante con el internet satelital de zonas rurales.
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'Ingresar | Telesalud Contigo Antioquia',
  },
  {
    // Todas las pantallas internas van dentro del layout (menu lateral).
    // authGuard protege al padre y por lo tanto a todas las hijas.
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      // La ruta vacia redirige segun el rol del usuario.
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).rutaInicio() },
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { roles: ['administrador', 'coordinador'] },
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard | Telesalud',
      },
      {
        path: 'atenciones',
        loadComponent: () =>
          import('./features/atenciones/lista-atenciones/lista-atenciones.component').then(
            (m) => m.ListaAtencionesComponent,
          ),
        title: 'Atenciones | Telesalud',
      },
      {
        path: 'atenciones/nueva',
        canActivate: [roleGuard],
        canDeactivate: [cambiosPendientesGuard],
        data: { roles: ['medico_ebs', 'administrador'] },
        loadComponent: () =>
          import('./features/atenciones/form-atencion/form-atencion.component').then((m) => m.FormAtencionComponent),
        title: 'Nueva atención | Telesalud',
      },
      {
        path: 'atenciones/:id/editar',
        canActivate: [roleGuard],
        canDeactivate: [cambiosPendientesGuard],
        data: { roles: ['medico_ebs', 'administrador'] },
        loadComponent: () =>
          import('./features/atenciones/form-atencion/form-atencion.component').then((m) => m.FormAtencionComponent),
        title: 'Editar atención | Telesalud',
      },
      {
        path: 'kits',
        canActivate: [roleGuard],
        data: { roles: ['administrador', 'coordinador'] },
        loadComponent: () => import('./features/kits/lista-kits/lista-kits.component').then((m) => m.ListaKitsComponent),
        title: 'Kits satelitales | Telesalud',
      },
      {
        // La pantalla de municipios es de gestion (coordenadas, kits): el medico
        // no la necesita. El medico SI sigue consultando GET /api/municipios
        // desde el formulario de atencion para elegir el municipio.
        path: 'municipios',
        canActivate: [roleGuard],
        data: { roles: ['administrador', 'coordinador'] },
        loadComponent: () =>
          import('./features/municipios/lista-municipios/lista-municipios.component').then(
            (m) => m.ListaMunicipiosComponent,
          ),
        title: 'Municipios | Telesalud',
      },
      {
        // Disponible para todos los roles: cada usuario edita sus propios datos.
        path: 'perfil',
        loadComponent: () => import('./features/perfil/mi-perfil.component').then((m) => m.MiPerfilComponent),
        title: 'Mi perfil | Telesalud',
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard],
        data: { roles: ['administrador'] },
        loadComponent: () =>
          import('./features/usuarios/lista-usuarios/lista-usuarios.component').then((m) => m.ListaUsuariosComponent),
        title: 'Usuarios | Telesalud',
      },
    ],
  },
  // Cualquier ruta desconocida vuelve al inicio en vez de mostrar una pagina en blanco.
  { path: '**', redirectTo: '' },
];
