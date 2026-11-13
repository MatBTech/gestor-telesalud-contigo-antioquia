import { Component, computed, ElementRef, HostListener, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, of, switchMap } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ArchivosService, AtencionesService, MunicipiosService } from '../../../core/services/api.services';
import { extraerMensajeError, NotificacionService } from '../../../core/services/notificacion.service';
import { AuthService } from '../../../core/services/auth.service';
import { Archivo, Atencion, AtencionFormulario, Municipio } from '../../../core/models/modelos';
import { ARCHIVOS, ESPECIALIDADES, formatearTamano, REGEX_NOMBRE } from '../../../core/constantes';
import { fechaNoFutura, noSoloEspacios, seleccionDeLista } from '../../../core/validadores';
import { ConCambiosPendientes } from '../../../core/guards/cambios-pendientes.guard';
import { ConfirmarDialogoComponent } from '../../../shared/confirmar-dialogo.component';

// Quita tildes y pasa a minusculas, para que al buscar "envigado" o
// "Envigádo" se encuentre "Envigado".
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Validador de grupo: si la fecha elegida es hoy, la hora no puede ser
// posterior a la hora actual.
function horaNoFutura(): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const fecha = grupo.get('fechaAtencion')?.value as Date | null;
    const hora = grupo.get('horaAtencion')?.value as string | null;
    if (!fecha || !hora) return null;
    const [h, m] = hora.split(':').map(Number);
    const completa = new Date(fecha);
    completa.setHours(h, m, 0, 0);
    return completa.getTime() > Date.now() + 60_000 ? { horaFutura: true } : null;
  };
}

// Formulario para registrar o editar una atencion. La misma pantalla sirve
// para los dos casos: si la URL trae un id, se esta editando.
@Component({
  selector: 'app-form-atencion',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatRadioModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './form-atencion.component.html',
  styleUrl: './form-atencion.component.scss',
})
export class FormAtencionComponent implements OnInit, ConCambiosPendientes {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly atencionesService = inject(AtencionesService);
  private readonly municipiosService = inject(MunicipiosService);
  private readonly archivosService = inject(ArchivosService);
  private readonly notificacion = inject(NotificacionService);
  private readonly auth = inject(AuthService);

  // Parametro :id de la ruta. Llega solo gracias a withComponentInputBinding.
  readonly id = input<string>();
  readonly modoEdicion = computed(() => !!this.id());

  readonly especialidades = ESPECIALIDADES;
  readonly aceptarArchivos = ARCHIVOS.accept;
  readonly formatearTamano = formatearTamano;
  readonly tamanoMaximoTexto = formatearTamano(ARCHIVOS.tamanoMaximoBytes);

  // Limites del selector de fecha: desde hace un ano hasta hoy.
  readonly fechaMaxima = new Date();
  readonly fechaMinima = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  })();

  readonly formulario = this.fb.group(
    {
      nombrePaciente: this.fb.nonNullable.control('', [
        Validators.required,
        noSoloEspacios(),
        Validators.minLength(3),
        Validators.maxLength(120),
        Validators.pattern(REGEX_NOMBRE),
      ]),
      especialidad: this.fb.control<string | null>(null, Validators.required),
      // El municipio guarda el OBJETO elegido del autocompletado (o el texto
      // mientras el usuario escribe). seleccionDeLista exige el objeto.
      municipio: this.fb.control<Municipio | string | null>(null, [Validators.required, seleccionDeLista()]),
      motivoConsulta: this.fb.nonNullable.control('', [
        Validators.required,
        noSoloEspacios(),
        Validators.minLength(10),
        Validators.maxLength(1000),
      ]),
      // Empieza en null (sin seleccionar) a proposito: asi el medico tiene
      // que decidir de forma consciente si se resolvio o no, en vez de
      // dejar un "No" marcado por defecto sin darse cuenta.
      resueltoEnTerritorio: this.fb.control<boolean | null>(null, Validators.required),
      fechaAtencion: this.fb.control<Date | null>(new Date(), [Validators.required, fechaNoFutura()]),
      horaAtencion: this.fb.control<string | null>(this.horaActual(), Validators.required),
    },
    { validators: horaNoFutura() },
  );

  readonly municipios = signal<Municipio[]>([]);
  readonly archivo = signal<File | null>(null);
  readonly errorArchivo = signal<string | null>(null);
  readonly archivosExistentes = signal<Archivo[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly errorServidor = signal<string | null>(null);
  private guardadoExitoso = false;

  // Texto que el usuario va escribiendo en el campo municipio.
  // Se lee del evento (input) y NO de valueChanges: con "requireSelection"
  // Material no pasa el texto escrito al formulario (el valor sigue en null
  // hasta que se elige una opcion), asi que valueChanges nunca traia el texto
  // y el filtro no funcionaba.
  readonly textoMunicipio = signal('');

  // Lista filtrada del autocompletado (sin importar tildes ni mayusculas).
  readonly municipiosFiltrados = computed(() => {
    const busqueda = normalizar(this.textoMunicipio());
    const lista = this.municipios();
    return busqueda ? lista.filter((m) => normalizar(m.nombre).includes(busqueda)) : lista;
  });

  // Resumen de errores junto a los botones (reemplaza al aviso flotante, que
  // tapaba la pregunta de "resuelto en territorio"). Se muestra despues del
  // primer intento de guardar y desaparece solo cuando todo esta correcto.
  readonly intentoGuardar = signal(false);
  private readonly estadoFormulario = toSignal(this.formulario.statusChanges, { initialValue: this.formulario.status });
  readonly camposConError = computed(() => {
    this.estadoFormulario(); // se recalcula cada vez que cambia la validez
    const controles = Object.values(this.formulario.controls).filter((c) => c.invalid).length;
    return controles + (this.formulario.hasError('horaFutura') ? 1 : 0);
  });

  // Contadores de caracteres que se muestran debajo de los campos.
  private readonly valorMotivo = toSignal(this.formulario.controls.motivoConsulta.valueChanges, { initialValue: '' });
  readonly largoMotivo = computed(() => (this.valorMotivo() ?? '').trim().length);

  ngOnInit(): void {
    this.cargando.set(true);
    this.municipiosService.listar().subscribe({
      next: (lista) => {
        this.municipios.set(lista);
        if (this.modoEdicion()) {
          this.cargarAtencion(Number(this.id()));
        } else {
          this.cargando.set(false);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorServidor.set(extraerMensajeError(err, 'No se pudo cargar la lista de municipios.'));
      },
    });
  }

  // Funcion que le dice al autocompletado que texto mostrar del objeto.
  mostrarMunicipio = (m: Municipio | string | null): string =>
    m && typeof m === 'object' ? `${m.nombre} (${m.subregion})` : (m ?? '');

  // ---------- Manejo del archivo de soporte ----------

  seleccionarArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    // Se limpia el input para que si eligen el mismo archivo otra vez
    // (despues de quitarlo) el evento change se dispare de nuevo.
    input.value = '';
    if (!archivo) return;

    const error = this.validarArchivo(archivo);
    this.errorArchivo.set(error);
    this.archivo.set(error ? null : archivo);
  }

  quitarArchivo(): void {
    this.archivo.set(null);
    this.errorArchivo.set(null);
  }

  // Validacion en el navegador ANTES de subir: evita esperar a que un
  // archivo de 20 MB viaje por internet satelital para que el servidor lo
  // rechace. El backend vuelve a validar todo por seguridad.
  private validarArchivo(archivo: File): string | null {
    const extension = archivo.name.slice(archivo.name.lastIndexOf('.')).toLowerCase();
    if (!ARCHIVOS.extensiones.includes(extension)) {
      return `El archivo "${archivo.name}" no es válido. Solo se permiten PDF, JPG o PNG.`;
    }
    // Algunos sistemas no informan el tipo (queda vacio); en ese caso basta la extension.
    if (archivo.type && !ARCHIVOS.tiposMime.includes(archivo.type)) {
      return `El tipo de archivo (${archivo.type}) no está permitido. Solo PDF, JPG o PNG.`;
    }
    if (archivo.size === 0) {
      return 'El archivo está vacío. Verifique que no esté dañado.';
    }
    if (archivo.size > ARCHIVOS.tamanoMaximoBytes) {
      return `El archivo pesa ${formatearTamano(archivo.size)} y el máximo permitido es ${this.tamanoMaximoTexto}. Si es una foto, reduzca su resolución.`;
    }
    return null;
  }

  descargar(archivo: Archivo): void {
    this.archivosService.descargar(archivo);
  }

  eliminarArchivoExistente(archivo: Archivo): void {
    this.dialog
      .open(ConfirmarDialogoComponent, {
        data: {
          titulo: 'Eliminar soporte',
          mensaje: `¿Eliminar el archivo "${archivo.nombreOriginal}"? Esta acción no se puede deshacer.`,
          textoConfirmar: 'Eliminar',
          peligro: true,
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.archivosService.eliminar(archivo.id).subscribe({
          next: () => {
            this.archivosExistentes.update((lista) => lista.filter((a) => a.id !== archivo.id));
            this.notificacion.exito('Soporte eliminado.');
          },
          error: (err) => this.notificacion.error(extraerMensajeError(err)),
        });
      });
  }

  // ---------- Guardado ----------

  guardar(): void {
    if (this.guardando()) return; // evita doble envio
    this.errorServidor.set(null);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.intentoGuardar.set(true);
      this.enfocarPrimerError();
      return;
    }

    const datos = this.construirDatos();
    const peticion: Observable<Atencion> = this.modoEdicion()
      ? this.atencionesService.actualizar(Number(this.id()), datos)
      : this.atencionesService.crear(datos);

    this.guardando.set(true);
    peticion
      .pipe(
        // Primero se guarda la atencion y, si hay archivo, se sube despues
        // usando el id que devolvio el servidor.
        switchMap((atencion) => {
          const archivo = this.archivo();
          if (!archivo) return of({ atencion, errorSubida: null as string | null });
          return new Observable<{ atencion: Atencion; errorSubida: string | null }>((obs) => {
            this.archivosService.subir(atencion.id, archivo).subscribe({
              next: () => {
                obs.next({ atencion, errorSubida: null });
                obs.complete();
              },
              // Si falla la subida, la atencion YA quedo guardada. No se
              // pierde: se informa y se lleva al usuario a editarla.
              error: (err) => {
                obs.next({ atencion, errorSubida: extraerMensajeError(err) });
                obs.complete();
              },
            });
          });
        }),
      )
      .subscribe({
        next: ({ atencion, errorSubida }) => {
          this.guardadoExitoso = true;
          this.guardando.set(false);
          if (errorSubida) {
            this.notificacion.error(`La atención se guardó, pero el soporte no se pudo subir: ${errorSubida}`);
            this.router.navigate(['/atenciones', atencion.id, 'editar']).then(() => this.recargarSiMismaRuta(atencion.id));
            return;
          }
          this.notificacion.exito(this.modoEdicion() ? 'Atención actualizada correctamente.' : 'Atención registrada correctamente.');
          this.router.navigate(['/atenciones']);
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorServidor.set(extraerMensajeError(err, 'No se pudo guardar la atención.'));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      });
  }

  cancelar(): void {
    this.router.navigate(['/atenciones']);
  }

  // Usado por el guard cambiosPendientesGuard.
  tieneCambiosPendientes(): boolean {
    return !this.guardadoExitoso && (this.formulario.dirty || this.archivo() !== null);
  }

  // Aviso del navegador si se intenta cerrar la pestana o recargar con
  // cambios sin guardar (el guard de Angular no cubre ese caso).
  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeSalir(evento: BeforeUnloadEvent): void {
    if (this.tieneCambiosPendientes()) evento.preventDefault();
  }

  // ---------- Metodos privados ----------

  private cargarAtencion(id: number): void {
    this.atencionesService.obtener(id).subscribe({
      next: (a) => {
        // Si es medico, solo puede editar lo suyo.
        const usuario = this.auth.usuario();
        if (usuario?.rol !== 'administrador' && a.registradoPorId !== usuario?.id) {
          this.notificacion.error('Solo puede editar las atenciones que usted registró.');
          this.router.navigate(['/atenciones']);
          return;
        }
        const fecha = new Date(a.fechaAtencion);
        this.formulario.reset({
          nombrePaciente: a.nombrePaciente,
          especialidad: a.especialidad,
          municipio: this.municipios().find((m) => m.id === a.municipioId) ?? null,
          motivoConsulta: a.motivoConsulta,
          resueltoEnTerritorio: a.resueltoEnTerritorio,
          fechaAtencion: fecha,
          horaAtencion: `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`,
        });
        this.archivosExistentes.set(a.archivos ?? []);
        this.cargando.set(false);
      },
      error: (err) => {
        this.notificacion.error(extraerMensajeError(err, 'No se encontró la atención.'));
        this.router.navigate(['/atenciones']);
      },
    });
  }

  // Si despues de crear se redirige a la edicion de la misma atencion,
  // se recargan los datos (Angular reutiliza el componente en ese caso).
  private recargarSiMismaRuta(id: number): void {
    if (this.modoEdicion() && Number(this.id()) === id) {
      this.guardadoExitoso = false;
      this.archivo.set(null);
      this.cargarAtencion(id);
    }
  }

  // Arma el objeto que espera la API, limpiando espacios sobrantes y
  // uniendo fecha y hora en un solo valor ISO.
  private construirDatos(): AtencionFormulario {
    const v = this.formulario.getRawValue();
    const fecha = new Date(v.fechaAtencion as Date);
    const [h, m] = (v.horaAtencion ?? '00:00').split(':').map(Number);
    fecha.setHours(h, m, 0, 0);
    return {
      nombrePaciente: v.nombrePaciente.trim().replace(/\s+/g, ' '),
      especialidad: v.especialidad as string,
      municipioId: (v.municipio as Municipio).id,
      motivoConsulta: v.motivoConsulta.trim(),
      resueltoEnTerritorio: v.resueltoEnTerritorio as boolean,
      fechaAtencion: fecha.toISOString(),
    };
  }

  // Lleva el cursor al primer campo con error, para que el usuario no
  // tenga que buscarlo (util en celular, donde el formulario es largo).
  private enfocarPrimerError(): void {
    setTimeout(() => {
      const campo = this.elemento.nativeElement.querySelector(
        'input.ng-invalid, textarea.ng-invalid, mat-select.ng-invalid, mat-radio-group.ng-invalid',
      ) as HTMLElement | null;
      campo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      campo?.focus();
    });
  }

  private horaActual(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
