import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

// Servicio para mostrar mensajes cortos (snackbar) con un estilo uniforme.
// Centralizarlo evita que cada componente configure el snackbar distinto.
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly snackBar = inject(MatSnackBar);

  exito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 4000, panelClass: 'snack-exito' });
  }

  // Los errores duran mas tiempo en pantalla para que alcancen a leerse.
  error(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 8000, panelClass: 'snack-error' });
  }

  info(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 5000, panelClass: 'snack-info' });
  }
}

// Extrae un mensaje legible de un error de la API.
// NestJS responde { message: "texto" } o { message: ["error 1", "error 2"] }
// cuando fallan varias validaciones; aqui se unen en un solo texto.
export function extraerMensajeError(error: unknown, porDefecto = 'No se pudo completar la operación.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor.';
    const mensaje = error.error?.message;
    if (Array.isArray(mensaje)) return mensaje.join('\n');
    if (typeof mensaje === 'string') return mensaje;
  }
  return porDefecto;
}
