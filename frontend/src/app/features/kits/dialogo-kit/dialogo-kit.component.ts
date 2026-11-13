import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { KitsService } from '../../../core/services/api.services';
import { extraerMensajeError } from '../../../core/services/notificacion.service';
import { valorNoRepetido } from '../../../core/validadores';
import { Kit, Municipio } from '../../../core/models/modelos';

// Datos que recibe el dialogo.
// modo 'crear':   formulario completo de un kit nuevo.
// modo 'editar':  cambia codigo y descripcion de un kit existente.
// modo 'asignar': solo pide el municipio para asignar un kit existente.
// codigosExistentes sirve para avisar en tiempo real si el codigo ya existe.
export interface DatosDialogoKit {
  modo: 'crear' | 'editar' | 'asignar';
  municipios: Municipio[];
  codigosExistentes: string[];
  kit?: Kit;
}

@Component({
  selector: 'app-dialogo-kit',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './dialogo-kit.component.html',
})
export class DialogoKitComponent {
  private readonly fb = inject(FormBuilder);
  private readonly kitsService = inject(KitsService);
  private readonly dialogRef = inject(MatDialogRef<DialogoKitComponent, Kit>);
  readonly datos = inject<DatosDialogoKit>(MAT_DIALOG_DATA);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly pideCodigo = this.datos.modo !== 'asignar';
  readonly titulo = {
    crear: 'Registrar kit satelital',
    editar: `Editar ${this.datos.kit?.codigo}`,
    asignar: `Asignar ${this.datos.kit?.codigo} a un municipio`,
  }[this.datos.modo];
  readonly textoBoton = { crear: 'Registrar kit', editar: 'Guardar cambios', asignar: 'Asignar kit' }[this.datos.modo];

  // Al editar, el codigo actual del kit no cuenta como repetido.
  private readonly otrosCodigos = this.datos.codigosExistentes.filter((c) => c !== this.datos.kit?.codigo);

  readonly formulario = this.fb.group({
    codigo: this.fb.nonNullable.control(
      this.datos.kit?.codigo ?? '',
      this.pideCodigo ? [Validators.required, Validators.pattern(/^KIT-\d{4}$/), valorNoRepetido(this.otrosCodigos)] : [],
    ),
    descripcion: this.fb.nonNullable.control(this.datos.kit?.descripcion ?? '', Validators.maxLength(150)),
    municipioId: this.fb.control<number | null>(null, this.datos.modo === 'asignar' ? Validators.required : []),
  });

  // Al asignar, no se ofrece el municipio donde ya esta el kit.
  readonly municipiosDisponibles = this.datos.municipios.filter((m) => m.id !== this.datos.kit?.municipioId);

  // Convierte a mayusculas mientras se escribe y agrega el guion si el
  // usuario escribe "kit0001", asi el formato queda bien sin pensar en el.
  // Se marca el control como modificado para que la validacion en tiempo
  // real muestre el error mientras escribe.
  formatearCodigo(): void {
    const control = this.formulario.controls.codigo;
    let valor = control.value.toUpperCase().replace(/\s/g, '');
    if (/^KIT\d/.test(valor)) valor = 'KIT-' + valor.slice(3);
    if (valor !== control.value) control.setValue(valor);
    control.markAsDirty();
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      Object.values(this.formulario.controls).forEach((c) => c.markAsDirty());
      return;
    }
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    const v = this.formulario.getRawValue();
    const kit = this.datos.kit;

    const peticion =
      this.datos.modo === 'crear'
        ? this.kitsService.crear({
            codigo: v.codigo,
            descripcion: v.descripcion.trim() || undefined,
            municipioId: v.municipioId ?? undefined,
          })
        : this.datos.modo === 'editar'
          ? this.kitsService.actualizar(kit!.id, { codigo: v.codigo, descripcion: v.descripcion.trim() })
          : this.kitsService.cambiarEstado(kit!.id, 'asignado', v.municipioId!);

    peticion.subscribe({
      // Se cierra el dialogo devolviendo el kit guardado a la lista.
      next: (guardado) => this.dialogRef.close(guardado),
      error: (err) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}
