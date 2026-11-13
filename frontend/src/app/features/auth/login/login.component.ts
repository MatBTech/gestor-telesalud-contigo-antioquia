import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/services/auth.service';
import { extraerMensajeError } from '../../../core/services/notificacion.service';

// Pantalla de inicio de sesion.
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  // Formulario reactivo. nonNullable hace que al reiniciar los campos
  // vuelvan a '' en vez de null.
  readonly formulario = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    password: ['', [Validators.required, Validators.maxLength(64)]],
  });

  readonly cargando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly mostrarPassword = signal(false);
  readonly bloqMayusActivo = signal(false);

  // Si el usuario llego aqui porque se vencio su sesion, se le explica.
  readonly sesionExpirada = this.ruta.snapshot.queryParamMap.has('expirada');

  ingresar(): void {
    // Si el formulario es invalido se marcan todos los campos como tocados
    // para que aparezcan los mensajes de error, y no se envia nada.
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    // Evita el doble envio si el usuario hace varios clics seguidos.
    if (this.cargando()) return;

    this.cargando.set(true);
    this.mensajeError.set(null);
    const { correo, password } = this.formulario.getRawValue();

    this.auth.login(correo.trim().toLowerCase(), password).subscribe({
      next: () => {
        // Vuelve a la pagina que el usuario queria abrir, o a su inicio.
        const returnUrl = this.ruta.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : this.auth.rutaInicio());
      },
      error: (err) => {
        this.cargando.set(false);
        this.mensajeError.set(extraerMensajeError(err, 'No fue posible iniciar sesión.'));
        // Se limpia la contrasena para que la vuelva a escribir con cuidado.
        this.formulario.controls.password.reset();
      },
    });
  }

  // Detecta si el Bloq Mayus esta activo mientras se escribe la contrasena.
  // Es una de las causas mas comunes de "contrasena incorrecta".
  revisarBloqMayus(evento: KeyboardEvent): void {
    this.bloqMayusActivo.set(evento.getModifierState?.('CapsLock') ?? false);
  }
}
