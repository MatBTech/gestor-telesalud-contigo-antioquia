import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Kit } from '../../../core/models/modelos';
import { etiquetaEstadoKit } from '../../../core/constantes';

// Dialogo de solo lectura con la informacion completa de un kit.
// Igual que en atenciones, la tabla muestra solo lo esencial y la
// descripcion (que puede ser larga) se consulta aqui.
@Component({
  selector: 'app-detalle-kit',
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Detalle del kit</h2>
    <mat-dialog-content>
      <div class="cabecera">
        <span class="codigo">{{ kit.codigo }}</span>
        <span [class]="'etiqueta ' + estado.clase"><mat-icon inline>{{ estado.icono }}</mat-icon>{{ estado.etiqueta }}</span>
      </div>

      <dl class="datos">
        <dt>Municipio</dt>
        <dd>
          @if (kit.municipio) {
            {{ kit.municipio.nombre }} <span class="texto-secundario">· {{ kit.municipio.subregion }}</span>
          } @else {
            <span class="texto-secundario">En bodega (sin asignar)</span>
          }
        </dd>
        <dt>Fecha de asignación</dt>
        <dd>{{ kit.fechaAsignacion ? (kit.fechaAsignacion | date: 'dd/MM/yyyy') : '—' }}</dd>
      </dl>

      <div class="bloque">
        <span class="titulo-bloque">Descripción</span>
        <p class="descripcion">{{ kit.descripcion || 'Sin descripción registrada.' }}</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close cdkFocusInitial>Cerrar</button>
      @if (kit.estado !== 'dado_de_baja') {
        <button mat-flat-button [mat-dialog-close]="'editar'"><mat-icon>edit</mat-icon> Editar</button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .cabecera { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .codigo { font-size: 1.2rem; font-weight: 500; color: var(--ant-verde-oscuro); }
    .datos {
      display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 8px 16px; margin: 0;
      padding: 12px 0; border-top: 1px solid #e3e7e4; border-bottom: 1px solid #e3e7e4;
    }
    .datos dt { color: var(--ant-gris-texto); font-size: 0.85rem; }
    .datos dd { margin: 0; overflow-wrap: anywhere; }
    .bloque { display: flex; flex-direction: column; gap: 6px; }
    .titulo-bloque { font-weight: 500; color: var(--ant-verde-oscuro); }
    .descripcion {
      margin: 0; white-space: pre-line; overflow-wrap: anywhere; line-height: 1.5;
      background: var(--ant-gris-fondo); border-radius: 8px; padding: 10px 12px;
    }
    @media (max-width: 480px) { .datos { grid-template-columns: 1fr; gap: 2px; } .datos dd { margin-bottom: 8px; } }
  `,
})
export class DetalleKitComponent {
  readonly kit = inject<Kit>(MAT_DIALOG_DATA);
  readonly estado = etiquetaEstadoKit(this.kit.estado);
}
