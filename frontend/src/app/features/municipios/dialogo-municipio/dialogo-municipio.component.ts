import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MunicipiosService } from '../../../core/services/api.services';
import { extraerMensajeError } from '../../../core/services/notificacion.service';
import { Coordenadas, Municipio } from '../../../core/models/modelos';
import { LIMITES_ANTIOQUIA, REGEX_NOMBRE, SUBREGIONES } from '../../../core/constantes';
import { noSoloEspacios, valorNoRepetido } from '../../../core/validadores';

// Dialogo para crear o editar un municipio.
// Al crear, las coordenadas se obtienen de OpenStreetMap Nominatim (el
// backend hace la consulta). Si falla, se activan los campos manuales.
@Component({
  selector: 'app-dialogo-municipio',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dialogo-municipio.component.html',
})
export class DialogoMunicipioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly municipiosService = inject(MunicipiosService);
  private readonly dialogRef = inject(MatDialogRef<DialogoMunicipioComponent, Municipio>);
  // Si llega un municipio es edicion; si llega null es creacion.
  // nombresExistentes permite avisar en tiempo real si el nombre ya existe.
  private readonly datos = inject<{ municipio: Municipio | null; nombresExistentes: string[] }>(MAT_DIALOG_DATA);
  readonly municipio = this.datos.municipio;

  readonly subregiones = SUBREGIONES;
  readonly limites = LIMITES_ANTIOQUIA;

  readonly guardando = signal(false);
  readonly buscando = signal(false);
  readonly error = signal<string | null>(null);
  readonly vistaPrevia = signal<Coordenadas | null>(null);
  readonly avisoNominatim = signal<string | null>(null);

  readonly formulario = this.fb.group({
    nombre: this.fb.nonNullable.control(this.municipio?.nombre ?? '', [
      Validators.required,
      noSoloEspacios(),
      Validators.minLength(2),
      Validators.maxLength(80),
      Validators.pattern(REGEX_NOMBRE),
      // Al editar, el nombre actual del municipio no cuenta como repetido.
      valorNoRepetido(this.datos.nombresExistentes.filter((n) => n !== this.municipio?.nombre)),
    ]),
    subregion: this.fb.control<string | null>(this.municipio?.subregion ?? null, Validators.required),
    // En edicion las coordenadas siempre son manuales.
    manual: this.fb.nonNullable.control(!!this.municipio),
    latitud: this.fb.control<number | null>(this.municipio?.latitud ?? null),
    longitud: this.fb.control<number | null>(this.municipio?.longitud ?? null),
  });

  constructor() {
    this.actualizarValidadoresCoordenadas(this.formulario.controls.manual.value);
    // Cuando se marca "ingresar manualmente", latitud y longitud pasan a ser
    // obligatorias y con rango; cuando se desmarca dejan de serlo.
    this.formulario.controls.manual.valueChanges.subscribe((manual) => this.actualizarValidadoresCoordenadas(manual));
    // Si cambia el nombre, la vista previa anterior ya no aplica.
    this.formulario.controls.nombre.valueChanges.subscribe(() => this.vistaPrevia.set(null));
  }

  // Consulta Nominatim (a traves del backend) para mostrar las coordenadas
  // antes de guardar, asi el usuario puede verificar que sean correctas.
  buscarCoordenadas(): void {
    const nombre = this.formulario.controls.nombre;
    if (nombre.invalid) {
      nombre.markAsTouched();
      return;
    }
    this.buscando.set(true);
    this.avisoNominatim.set(null);
    this.municipiosService.geocodificar(nombre.value.trim()).subscribe({
      next: (coordenadas) => {
        this.buscando.set(false);
        this.vistaPrevia.set(coordenadas);
        // La subregion la define el mapa, no lo que el usuario haya elegido.
        if (coordenadas.subregion) {
          this.formulario.controls.subregion.setValue(coordenadas.subregion);
        }
      },
      error: (err) => {
        this.buscando.set(false);
        this.vistaPrevia.set(null);
        this.activarModoManual(extraerMensajeError(err, 'No se encontraron coordenadas.'));
      },
    });
  }

  // Copia la vista previa a los campos manuales por si el usuario quiere
  // ajustarlas un poco.
  usarVistaPreviaComoManual(): void {
    const vp = this.vistaPrevia();
    if (!vp) return;
    this.formulario.patchValue({ manual: true, latitud: vp.latitud, longitud: vp.longitud });
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);

    const v = this.formulario.getRawValue();
    const datos: { nombre: string; subregion: string; latitud?: number; longitud?: number } = {
      nombre: v.nombre.trim().replace(/\s+/g, ' '),
      subregion: v.subregion!,
    };
    // Solo se envian coordenadas si son manuales. Si no se envian, el
    // backend consulta Nominatim (requisito del proyecto).
    if (v.manual) {
      datos.latitud = Number(v.latitud);
      datos.longitud = Number(v.longitud);
    }

    const peticion = this.municipio
      ? this.municipiosService.actualizar(this.municipio.id, datos)
      : this.municipiosService.crear(datos);

    peticion.subscribe({
      next: (municipio) => this.dialogRef.close(municipio),
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        // 422 con este codigo = Nominatim no encontro el municipio.
        if (err.status === 422 && err.error?.codigo === 'GEOCODIFICACION_FALLIDA') {
          this.activarModoManual(err.error.message);
          return;
        }
        this.error.set(extraerMensajeError(err));
      },
    });
  }

  private activarModoManual(mensaje: string): void {
    this.avisoNominatim.set(mensaje);
    this.formulario.controls.manual.setValue(true);
  }

  private actualizarValidadoresCoordenadas(manual: boolean): void {
    const { latitud, longitud } = this.formulario.controls;
    if (manual) {
      latitud.setValidators([Validators.required, Validators.min(LIMITES_ANTIOQUIA.latMin), Validators.max(LIMITES_ANTIOQUIA.latMax)]);
      longitud.setValidators([Validators.required, Validators.min(LIMITES_ANTIOQUIA.lonMin), Validators.max(LIMITES_ANTIOQUIA.lonMax)]);
    } else {
      latitud.clearValidators();
      longitud.clearValidators();
    }
    latitud.updateValueAndValidity();
    longitud.updateValueAndValidity();
  }
}
