import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { ArchivosService, AtencionesService, MunicipiosService } from '../../../core/services/api.services';
import { AuthService } from '../../../core/services/auth.service';
import { extraerMensajeError, NotificacionService } from '../../../core/services/notificacion.service';
import { Archivo, Atencion, Municipio } from '../../../core/models/modelos';
import { ESPECIALIDADES, formatearTamano } from '../../../core/constantes';
import { ConfirmarDialogoComponent } from '../../../shared/confirmar-dialogo.component';
import { DetalleAtencionComponent } from '../detalle-atencion/detalle-atencion.component';

// Listado de atenciones con filtros, paginacion en el servidor y descarga
// de soportes.
@Component({
  selector: 'app-lista-atenciones',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './lista-atenciones.component.html',
})
export class ListaAtencionesComponent implements OnInit {
  private readonly atencionesService = inject(AtencionesService);
  private readonly municipiosService = inject(MunicipiosService);
  private readonly archivosService = inject(ArchivosService);
  private readonly auth = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly columnas = ['fecha', 'paciente', 'especialidad', 'municipio', 'resuelto', 'soportes', 'acciones'];
  readonly especialidades = ESPECIALIDADES;
  readonly formatearTamano = formatearTamano;

  readonly atenciones = signal<Atencion[]>([]);
  readonly municipios = signal<Municipio[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);

  // Estado de la paginacion.
  pagina = 0;
  tamanoPagina = 10;

  // Filtros. Se usa null para "Todos".
  readonly filtros = this.fb.group({
    municipioId: this.fb.control<number | null>(null),
    especialidad: this.fb.control<string | null>(null),
    resueltoEnTerritorio: this.fb.control<boolean | null>(null),
  });

  // Permisos que dependen del rol, para mostrar u ocultar botones.
  readonly puedeCrear = this.auth.tieneRol('medico_ebs', 'administrador');
  readonly esAdmin = this.auth.tieneRol('administrador');
  private readonly idUsuario = this.auth.usuario()?.id;

  ngOnInit(): void {
    this.municipiosService.listar().subscribe((lista) => this.municipios.set(lista));
    this.cargar();

    // Cada vez que cambia un filtro se vuelve a la primera pagina y se
    // recarga. Asi el usuario no queda en la pagina 5 de un resultado que
    // ahora solo tiene 1 pagina.
    this.filtros.valueChanges.subscribe(() => {
      this.pagina = 0;
      this.cargar();
    });
  }

  cargar(): void {
    this.cargando.set(true);
    const f = this.filtros.getRawValue();
    this.atencionesService
      .listar({
        municipioId: f.municipioId,
        especialidad: f.especialidad,
        resueltoEnTerritorio: f.resueltoEnTerritorio,
        pagina: this.pagina + 1, // el paginador cuenta desde 0 y la API desde 1
        limite: this.tamanoPagina,
      })
      .subscribe({
        next: (respuesta) => {
          this.atenciones.set(respuesta.datos);
          this.total.set(respuesta.total);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.notificacion.error(extraerMensajeError(err, 'No se pudieron cargar las atenciones.'));
        },
      });
  }

  cambiarPagina(evento: PageEvent): void {
    this.pagina = evento.pageIndex;
    this.tamanoPagina = evento.pageSize;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtros.reset({ municipioId: null, especialidad: null, resueltoEnTerritorio: null });
  }

  hayFiltros(): boolean {
    const f = this.filtros.getRawValue();
    return f.municipioId !== null || f.especialidad !== null || f.resueltoEnTerritorio !== null;
  }

  descargar(archivo: Archivo): void {
    this.archivosService.descargar(archivo);
  }

  // El medico solo puede editar lo que el mismo registro (el backend
  // tambien lo valida, esto es solo para no mostrar un boton inutil).
  puedeEditar(atencion: Atencion): boolean {
    return this.esAdmin || (this.puedeCrear && atencion.registradoPorId === this.idUsuario);
  }

  // Abre el detalle en un dialogo. Si el usuario puede editar y elige
  // "Editar" dentro del dialogo, se navega al formulario.
  verDetalle(atencion: Atencion): void {
    const puedeEditar = this.puedeEditar(atencion);
    this.dialog
      .open(DetalleAtencionComponent, { data: { atencion, puedeEditar }, width: '560px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((accion) => {
        if (accion === 'editar') this.router.navigate(['/atenciones', atencion.id, 'editar']);
      });
  }

  eliminar(atencion: Atencion): void {
    const soportes = atencion.archivos?.length ?? 0;
    this.dialog
      .open(ConfirmarDialogoComponent, {
        data: {
          titulo: 'Eliminar atención',
          mensaje:
            `Se eliminará la atención de ${atencion.nombrePaciente}` +
            (soportes ? ` y sus ${soportes} soporte(s) adjunto(s).` : '.') +
            '\nEsta acción no se puede deshacer.',
          textoConfirmar: 'Eliminar',
          peligro: true,
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.atencionesService.eliminar(atencion.id).subscribe({
          next: () => {
            this.notificacion.exito('Atención eliminada.');
            // Si se borro el ultimo registro de la pagina, se retrocede una.
            if (this.atenciones().length === 1 && this.pagina > 0) this.pagina--;
            this.cargar();
          },
          error: (err) => this.notificacion.error(extraerMensajeError(err)),
        });
      });
  }
}
