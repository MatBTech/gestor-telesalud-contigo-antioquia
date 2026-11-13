import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DatosConfirmacion {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  // Si es true el boton de confirmar sale en rojo (acciones destructivas).
  peligro?: boolean;
}

// Dialogo reutilizable de confirmacion.
// Se usa antes de toda accion que no se puede deshacer (eliminar, dar de
// baja un kit, desactivar un usuario) para evitar clics accidentales.
// Devuelve true si el usuario confirma.
@Component({
  selector: 'app-confirmar-dialogo',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ datos.titulo }}</h2>
    <mat-dialog-content>
      <p style="white-space: pre-line; margin: 0">{{ datos.mensaje }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <!-- El boton de cancelar recibe el foco inicial (cdkFocusInitial) para
           que si el usuario presiona Enter sin pensar, NO se ejecute la accion. -->
      <button mat-button [mat-dialog-close]="false" cdkFocusInitial>
        {{ datos.textoCancelar ?? 'Cancelar' }}
      </button>
      <button mat-flat-button [class.boton-peligro]="datos.peligro" [mat-dialog-close]="true">
        {{ datos.textoConfirmar ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmarDialogoComponent {
  readonly datos = inject<DatosConfirmacion>(MAT_DIALOG_DATA);
}
