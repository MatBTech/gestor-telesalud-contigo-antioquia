import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MunicipiosService } from '../../../core/services/api.services';
import { AuthService } from '../../../core/services/auth.service';
import { extraerMensajeError, NotificacionService } from '../../../core/services/notificacion.service';
import { Municipio } from '../../../core/models/modelos';
import { SUBREGIONES } from '../../../core/constantes';
import { ConfirmarDialogoComponent } from '../../../shared/confirmar-dialogo.component';
import { DialogoMunicipioComponent } from '../dialogo-municipio/dialogo-municipio.component';

// Quita tildes para que la busqueda "urraó" o "URRAO" encuentre "Urrao".
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

@Component({
  selector: 'app-lista-municipios',
  imports: [
    DecimalPipe,
    FormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './lista-municipios.component.html',
})
export class ListaMunicipiosComponent implements OnInit {
  private readonly municipiosService = inject(MunicipiosService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  readonly puedeGestionar = this.auth.tieneRol('administrador', 'coordinador');
  readonly esAdmin = this.auth.tieneRol('administrador');
  readonly subregiones = SUBREGIONES;
  readonly columnas = ['nombre', 'subregion', 'coordenadas', 'origen', 'atenciones', 'kits', 'acciones'];

  readonly municipios = signal<Municipio[]>([]);
  readonly cargando = signal(false);
  readonly textoBusqueda = signal('');
  readonly subregionFiltro = signal<string | null>(null);

  readonly filtrados = computed(() => {
    const texto = normalizar(this.textoBusqueda().trim());
    const sub = this.subregionFiltro();
    return this.municipios().filter(
      (m) => (!texto || normalizar(m.nombre).includes(texto)) && (!sub || m.subregion === sub),
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.municipiosService.listar().subscribe({
      next: (lista) => {
        this.municipios.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.notificacion.error(extraerMensajeError(err, 'No se pudieron cargar los municipios.'));
      },
    });
  }

  abrirDialogo(municipio: Municipio | null = null): void {
    this.dialog
      .open(DialogoMunicipioComponent, {
        data: { municipio, nombresExistentes: this.municipios().map((m) => m.nombre) },
        width: '560px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((guardado?: Municipio) => {
        if (!guardado) return;
        this.notificacion.exito(
          municipio
            ? `Municipio ${guardado.nombre} actualizado.`
            : `Municipio ${guardado.nombre} registrado (coordenadas: ${guardado.origenCoordenadas === 'nominatim' ? 'OpenStreetMap' : 'manuales'}).`,
        );
        this.cargar();
      });
  }

  // Solo se puede eliminar si no tiene atenciones ni kits (regla del backend).
  puedeEliminar(m: Municipio): boolean {
    return (m.totalAtenciones ?? 0) === 0 && (m.totalKits ?? 0) === 0;
  }

  eliminar(m: Municipio): void {
    this.dialog
      .open(ConfirmarDialogoComponent, {
        data: {
          titulo: 'Eliminar municipio',
          mensaje: `¿Eliminar el municipio ${m.nombre}? Esta acción no se puede deshacer.`,
          textoConfirmar: 'Eliminar',
          peligro: true,
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.municipiosService.eliminar(m.id).subscribe({
          next: () => {
            this.notificacion.exito(`Municipio ${m.nombre} eliminado.`);
            this.municipios.update((lista) => lista.filter((x) => x.id !== m.id));
          },
          error: (err) => this.notificacion.error(extraerMensajeError(err)),
        });
      });
  }

  // Enlace al mapa de OpenStreetMap para verificar visualmente la ubicacion.
  urlMapa(m: Municipio): string {
    return `https://www.openstreetmap.org/?mlat=${m.latitud}&mlon=${m.longitud}#map=13/${m.latitud}/${m.longitud}`;
  }
}
