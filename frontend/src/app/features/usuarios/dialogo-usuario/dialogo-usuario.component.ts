import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UsuariosService } from '../../../core/services/api.services';
import { extraerMensajeError } from '../../../core/services/notificacion.service';
import { Usuario } from '../../../core/models/modelos';
import { REGEX_NOMBRE, REGEX_PASSWORD, ROLES } from '../../../core/constantes';
import { camposIguales, noSoloEspacios, valorNoRepetido } from '../../../core/validadores';

// Dialogo para crear un usuario o editar uno existente.
// En edicion la contrasena es opcional (solo se llena para restablecerla)
// y el correo no se puede cambiar.
@Component({
  selector: 'app-dialogo-usuario',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './dialogo-usuario.component.html',
})
export class DialogoUsuarioComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialogRef = inject(MatDialogRef<DialogoUsuarioComponent, Usuario>);
  // usuario null = creacion. correosExistentes permite avisar en tiempo real
  // si el correo ya esta registrado.
  private readonly datos = inject<{ usuario: Usuario | null; correosExistentes: string[] }>(MAT_DIALOG_DATA);
  readonly usuario = this.datos.usuario;

  readonly roles = ROLES;
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly mostrarPassword = signal(false);

  // En creacion la contrasena es obligatoria; en edicion no.
  private readonly validadoresPassword = [
    ...(this.usuario ? [] : [Validators.required]),
    Validators.minLength(8),
    Validators.maxLength(64),
    Validators.pattern(REGEX_PASSWORD),
  ];

  readonly formulario = this.fb.group(
    {
      nombreCompleto: this.fb.nonNullable.control(this.usuario?.nombreCompleto ?? '', [
        Validators.required,
        noSoloEspacios(),
        Validators.minLength(3),
        Validators.maxLength(120),
        Validators.pattern(REGEX_NOMBRE),
      ]),
      correo: this.fb.nonNullable.control(
        { value: this.usuario?.correo ?? '', disabled: !!this.usuario },
        [Validators.required, Validators.email, Validators.maxLength(120), valorNoRepetido(this.datos.correosExistentes)],
      ),
      rol: this.fb.control<string | null>(this.usuario?.rol.nombre ?? null, Validators.required),
      password: this.fb.nonNullable.control('', this.validadoresPassword),
      confirmarPassword: this.fb.nonNullable.control(''),
    },
    { validators: camposIguales('password', 'confirmarPassword') },
  );

  guardar(): void {
    const v = this.formulario.getRawValue();
    // Si escribio contrasena, la confirmacion es obligatoria.
    if (v.password && !v.confirmarPassword) {
      this.formulario.controls.confirmarPassword.setErrors({ required: true });
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);

    const nombre = v.nombreCompleto.trim().replace(/\s+/g, ' ');
    const peticion = this.usuario
      ? this.usuariosService.actualizar(this.usuario.id, {
          nombreCompleto: nombre,
          rol: v.rol!,
          ...(v.password ? { password: v.password } : {}),
        })
      : this.usuariosService.registrar({
          nombreCompleto: nombre,
          correo: v.correo.trim().toLowerCase(),
          password: v.password,
          rol: v.rol!,
        });

    peticion.subscribe({
      next: (usuario) => this.dialogRef.close(usuario),
      error: (err) => {
        this.guardando.set(false);
        this.error.set(extraerMensajeError(err));
      },
    });
  }
}
