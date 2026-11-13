import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { KitsService, MunicipiosService } from '../../../core/services/api.services';
import { AuthService } from '../../../core/services/auth.service';
import { extraerMensajeError, NotificacionService } from '../../../core/services/notificacion.service';
import { EstadoKit, Kit, Municipio } from '../../../core/models/modelos';
import { ESTADOS_KIT, etiquetaEstadoKit } from '../../../core/constantes';
import { ConfirmarDialogoComponent } from '../../../shared/confirmar-dialogo.component';
import { DatosDialogoKit, DialogoKitComponent } from '../dialogo-kit/dialogo-kit.component';
import { DetalleKitComponent } from '../detalle-kit/detalle-kit.component';

// Inventario de kits satelitales con cambio de estado desde la tabla.
@Component({
  selector: 'app-lista-kits',
  imports: [
    DatePipe,
    FormsModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatButtonToggleModule,
  ],
  templateUrl: './lista-kits.component.html',
})
export class ListaKitsComponent implements OnInit {
  private readonly kitsService = inject(KitsService);
  private readonly municipiosService = inject(MunicipiosService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  readonly esAdmin = inject(AuthService).tieneRol('administrador');

  // La descripcion no va en la tabla: se consulta en "Ver detalle".
  readonly columnas = ['codigo', 'estado', 'municipio', 'fechaAsignacion', 'acciones'];
  readonly estados = ESTADOS_KIT;
  readonly etiquetaEstado = etiquetaEstadoKit;

  readonly kits = signal<Kit[]>([]);
  readonly municipios = signal<Municipio[]>([]);
  readonly cargando = signal(false);
  readonly filtroEstado = signal<EstadoKit | 'todos'>('todos');

  // El filtro por estado se hace en el navegador porque el inventario es
  // pequeno (decenas de kits), asi el cambio es instantaneo.
  readonly kitsFiltrados = computed(() => {
    const filtro = this.filtroEstado();
    return filtro === 'todos' ? this.kits() : this.kits().filter((k) => k.estado === filtro);
  });

  contar(estado: EstadoKit): number {
    return this.kits().filter((k) => k.estado === estado).length;
  }

  ngOnInit(): void {
    this.municipiosService.listar().subscribe((lista) => this.municipios.set(lista));
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.kitsService.listar().subscribe({
      next: (lista) => {
        this.kits.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.notificacion.error(extraerMensajeError(err, 'No se pudo cargar el inventario.'));
      },
    });
  }

  nuevoKit(): void {
    if (this.municipios().length === 0) {
      this.notificacion.info('Puede registrar el kit, pero aún no hay municipios para asignarlo.');
    }
    this.abrirDialogo({ modo: 'crear', municipios: this.municipios() }, 'Kit registrado correctamente.');
  }

  // Se ejecuta cuando el usuario elige un estado nuevo en el select de la fila.
  cambiarEstado(kit: Kit, evento: MatSelectChange): void {
    const nuevo = evento.value as EstadoKit;
    // Funcion para devolver el select a su valor original si se cancela.
    const revertir = () => (evento.source.value = kit.estado);

    // Para asignar hace falta el municipio: se abre el dialogo.
    if (nuevo === 'asignado') {
      this.abrirDialogo({ modo: 'asignar', municipios: this.municipios(), kit }, `Kit ${kit.codigo} asignado.`, revertir);
      return;
    }

    // Para los demas estados se confirma explicando las consecuencias.
    const textoNuevo = etiquetaEstadoKit(nuevo).etiqueta;
    let mensaje = `¿Cambiar el kit ${kit.codigo} de "${etiquetaEstadoKit(kit.estado).etiqueta}" a "${textoNuevo}"?`;
    if (kit.municipio) mensaje += `\nEl kit se retirará del municipio ${kit.municipio.nombre}.`;
    if (nuevo === 'dado_de_baja') mensaje += '\nUn kit dado de baja NO podrá volver a cambiar de estado.';

    this.dialog
      .open(ConfirmarDialogoComponent, {
        data: { titulo: 'Cambiar estado del kit', mensaje, textoConfirmar: 'Cambiar estado', peligro: nuevo === 'dado_de_baja' },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) {
          revertir();
          return;
        }
        this.kitsService.cambiarEstado(kit.id, nuevo).subscribe({
          next: (actualizado) => {
            this.reemplazarKit(actualizado);
            this.notificacion.exito(`Kit ${kit.codigo}: ${textoNuevo}.`);
          },
          error: (err) => {
            revertir();
            this.notificacion.error(extraerMensajeError(err));
          },
        });
      });
  }

  eliminar(kit: Kit): void {
    this.dialog
      .open(ConfirmarDialogoComponent, {
        data: {
          titulo: 'Eliminar kit',
          mensaje: `¿Eliminar el kit ${kit.codigo} del inventario? Esta acción no se puede deshacer.`,
          textoConfirmar: 'Eliminar',
          peligro: true,
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.kitsService.eliminar(kit.id).subscribe({
          next: () => {
            this.kits.update((lista) => lista.filter((k) => k.id !== kit.id));
            this.notificacion.exito(`Kit ${kit.codigo} eliminado.`);
          },
          error: (err) => this.notificacion.error(extraerMensajeError(err)),
        });
      });
  }

  // Detalle de solo lectura. Si el usuario elige "Editar" dentro del
  // detalle, se abre el formulario de edicion.
  verDetalle(kit: Kit): void {
    this.dialog
      .open(DetalleKitComponent, { data: kit, width: '480px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((accion) => {
        if (accion === 'editar') this.editar(kit);
      });
  }

  editar(kit: Kit): void {
    this.abrirDialogo({ modo: 'editar', municipios: this.municipios(), kit }, `Kit ${kit.codigo} actualizado.`);
  }

  // Se agregan los codigos actuales para que el dialogo avise en tiempo
  // real si el codigo escrito ya existe.
  private abrirDialogo(
    datos: Omit<DatosDialogoKit, 'codigosExistentes'>,
    mensajeExito: string,
    alCancelar?: () => void,
  ): void {
    const data: DatosDialogoKit = { ...datos, codigosExistentes: this.kits().map((k) => k.codigo) };
    this.dialog
      .open(DialogoKitComponent, { data, width: '480px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((kit?: Kit) => {
        if (!kit) {
          alCancelar?.();
          return;
        }
        this.notificacion.exito(mensajeExito);
        if (datos.modo === 'crear') {
          this.kits.update((lista) => [...lista, kit].sort((a, b) => a.codigo.localeCompare(b.codigo)));
        } else {
          this.reemplazarKit(kit);
        }
      });
  }

  private reemplazarKit(kit: Kit): void {
    this.kits.update((lista) => lista.map((k) => (k.id === kit.id ? kit : k)));
  }
}
