import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { extraerMensajeError, NotificacionService } from '../../core/services/notificacion.service';
import { etiquetaRol, REGEX_NOMBRE, REGEX_PASSWORD } from '../../core/constantes';
import { camposIguales, noSoloEspacios } from '../../core/validadores';

// Pantalla "Mi perfil": cualquier usuario consulta sus datos, cambia su
// nombre y su contrasena. El correo y el rol solo los cambia el administrador.
@Component({
  selector: 'app-mi-perfil',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './mi-perfil.component.html',
  styleUrl: './mi-perfil.component.scss',
})
export class MiPerfilComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notificacion = inject(NotificacionService);

  readonly usuario = this.auth.usuario;
  readonly rol = computed(() => etiquetaRol(this.usuario()?.rol ?? ''));
  // Iniciales para el circulo de la cabecera: "Andres Felipe Gomez" -> "AF".
  readonly iniciales = computed(() =>
    (this.usuario()?.nombreCompleto ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join(''),
  );

  // ---------- Datos personales ----------
  readonly formDatos = this.fb.nonNullable.group({
    nombreCompleto: [
      this.usuario()?.nombreCompleto ?? '',
      [Validators.required, noSoloEspacios(), Validators.minLength(3), Validators.maxLength(120), Validators.pattern(REGEX_NOMBRE)],
    ],
  });
  readonly guardandoDatos = signal(false);
  readonly errorDatos = signal<string | null>(null);

  guardarDatos(): void {
    if (this.formDatos.invalid || this.guardandoDatos()) {
      this.formDatos.markAllAsTouched();
      return;
    }
    const nombre = this.formDatos.getRawValue().nombreCompleto.trim().replace(/\s+/g, ' ');
    this.guardandoDatos.set(true);
    this.errorDatos.set(null);
    this.auth.actualizarPerfil(nombre).subscribe({
      next: (u) => {
        this.guardandoDatos.set(false);
        // Se deja el formulario "limpio" con el valor guardado, asi el boton
        // Guardar vuelve a deshabilitarse hasta el proximo cambio.
        this.formDatos.reset({ nombreCompleto: u.nombreCompleto });
        this.notificacion.exito('Sus datos se actualizaron correctamente.');
      },
      error: (err) => {
        this.guardandoDatos.set(false);
        this.errorDatos.set(extraerMensajeError(err));
      },
    });
  }

  // ---------- Cambio de contrasena ----------
  readonly formPassword = this.fb.nonNullable.group(
    {
      passwordActual: ['', [Validators.required, Validators.maxLength(64)]],
      passwordNueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), Validators.pattern(REGEX_PASSWORD)]],
      confirmarPassword: ['', Validators.required],
    },
    { validators: camposIguales('passwordNueva', 'confirmarPassword') },
  );
  readonly mostrarPasswords = signal(false);
  readonly guardandoPassword = signal(false);
  readonly errorPassword = signal<string | null>(null);

  cambiarPassword(formDirective: FormGroupDirective): void {
    if (this.formPassword.invalid || this.guardandoPassword()) {
      this.formPassword.markAllAsTouched();
      return;
    }
    const { passwordActual, passwordNueva } = this.formPassword.getRawValue();
    this.guardandoPassword.set(true);
    this.errorPassword.set(null);
    this.auth.cambiarPassword(passwordActual, passwordNueva).subscribe({
      next: (r) => {
        this.guardandoPassword.set(false);
        // resetForm limpia tambien el estado "enviado" del formulario, asi no
        // quedan los campos vacios marcados en rojo despues del cambio.
        formDirective.resetForm();
        this.mostrarPasswords.set(false);
        this.notificacion.exito(r.mensaje);
      },
      error: (err) => {
        this.guardandoPassword.set(false);
        this.errorPassword.set(extraerMensajeError(err));
        // Se limpia la contrasena actual para que la vuelva a escribir.
        this.formPassword.controls.passwordActual.reset();
      },
    });
  }
}
