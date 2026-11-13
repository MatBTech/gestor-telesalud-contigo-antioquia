import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../core/services/auth.service';
import { NombreRol } from '../core/models/modelos';
import { etiquetaRol } from '../core/constantes';
import { ConfirmarDialogoComponent } from '../shared/confirmar-dialogo.component';

// Llave donde se guarda si el usuario dejo el menu replegado.
const LLAVE_MENU = 'telesalud_menu_replegado';

// Opcion del menu lateral con los roles que la pueden ver.
interface OpcionMenu {
  ruta: string;
  texto: string;
  icono: string;
  roles: NombreRol[];
}

// Layout principal: barra superior + menu lateral + contenido.
// En escritorio el menu queda fijo a la izquierda; en celular se oculta y
// se abre con el boton de hamburguesa. Se usa BreakpointObserver de
// Angular CDK en lugar de @angular/flex-layout, que fue descontinuado.
@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly sidenav = viewChild.required<MatSidenav>('sidenav');

  // true cuando la pantalla es de celular o tablet pequena.
  readonly esMovil = toSignal(
    inject(BreakpointObserver)
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map((resultado) => resultado.matches)),
    { initialValue: false },
  );

  // Barra replegada (solo iconos) en escritorio. Se recuerda en el navegador
  // para que la preferencia se mantenga al recargar. En celular nunca se
  // repliega: alli el menu se abre y se cierra completo.
  private readonly preferenciaReplegado = signal(this.leerPreferencia());
  readonly replegado = computed(() => !this.esMovil() && this.preferenciaReplegado());

  readonly usuario = this.auth.usuario;
  readonly etiquetaRol = computed(() => etiquetaRol(this.usuario()?.rol ?? ''));

  private readonly opciones: OpcionMenu[] = [
    { ruta: '/dashboard', texto: 'Dashboard', icono: 'dashboard', roles: ['administrador', 'coordinador'] },
    { ruta: '/atenciones', texto: 'Atenciones', icono: 'medical_services', roles: ['administrador', 'coordinador', 'medico_ebs'] },
    { ruta: '/municipios', texto: 'Municipios', icono: 'location_city', roles: ['administrador', 'coordinador'] },
    { ruta: '/kits', texto: 'Kits satelitales', icono: 'satellite_alt', roles: ['administrador', 'coordinador'] },
    { ruta: '/usuarios', texto: 'Usuarios', icono: 'manage_accounts', roles: ['administrador'] },
  ];

  // Solo se muestran las opciones permitidas para el rol del usuario, asi
  // nadie hace clic en una seccion a la que no tiene acceso.
  readonly menu = computed(() => {
    const rol = this.usuario()?.rol;
    return this.opciones.filter((o) => rol && o.roles.includes(rol));
  });

  constructor() {
    // En celular el menu se cierra solo despues de elegir una opcion.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      if (this.esMovil()) this.sidenav().close();
    });
  }

  alternarMenu(): void {
    if (this.esMovil()) {
      this.sidenav().toggle();
      return;
    }
    const nuevo = !this.preferenciaReplegado();
    this.preferenciaReplegado.set(nuevo);
    try {
      localStorage.setItem(LLAVE_MENU, nuevo ? '1' : '0');
    } catch {
      // Si el navegador bloquea el almacenamiento, solo se pierde la preferencia.
    }
  }

  private leerPreferencia(): boolean {
    try {
      return localStorage.getItem(LLAVE_MENU) === '1';
    } catch {
      return false;
    }
  }

  // Se pide confirmacion para no cerrar la sesion por un clic accidental.
  cerrarSesion(): void {
    this.dialog
      .open(ConfirmarDialogoComponent, {
        data: {
          titulo: 'Cerrar sesión',
          mensaje: '¿Desea salir del sistema?',
          textoConfirmar: 'Cerrar sesión',
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) this.auth.logout();
      });
  }
}
