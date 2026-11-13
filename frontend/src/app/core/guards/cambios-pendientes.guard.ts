import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { map, of } from 'rxjs';
import { ConfirmarDialogoComponent } from '../../shared/confirmar-dialogo.component';

// Los componentes que usen este guard deben implementar esta interfaz.
export interface ConCambiosPendientes {
  tieneCambiosPendientes(): boolean;
}

// Guard que evita perder un formulario a medio llenar.
// Si el usuario hace clic en otra opcion del menu con datos sin guardar,
// se le pregunta si de verdad quiere salir.
export const cambiosPendientesGuard: CanDeactivateFn<ConCambiosPendientes> = (componente) => {
  if (!componente.tieneCambiosPendientes()) return of(true);

  return inject(MatDialog)
    .open(ConfirmarDialogoComponent, {
      data: {
        titulo: '¿Salir sin guardar?',
        mensaje: 'Tiene cambios sin guardar en el formulario. Si sale ahora se perderán.',
        textoConfirmar: 'Salir sin guardar',
        textoCancelar: 'Seguir editando',
        peligro: true,
      },
    })
    .afterClosed()
    .pipe(map((respuesta) => respuesta === true));
};
