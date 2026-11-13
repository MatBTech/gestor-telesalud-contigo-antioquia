import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ArchivosService } from '../../../core/services/api.services';
import { Archivo, Atencion } from '../../../core/models/modelos';
import { formatearTamano } from '../../../core/constantes';

// Datos que recibe el dialogo: la atencion (ya viene completa desde el
// listado, con municipio, archivos y quien la registro) y si el usuario
// actual la puede editar, para mostrar u ocultar ese boton.
export interface DatosDetalleAtencion {
  atencion: Atencion;
  puedeEditar: boolean;
}

// Dialogo de solo lectura con toda la informacion de una atencion.
// Existe para que la tabla muestre solo lo esencial (nombre, especialidad,
// municipio) y el detalle largo, como el motivo de consulta, se consulte aqui.
// Lo pueden abrir todos los roles, incluso cuando no pueden editar.
@Component({
  selector: 'app-detalle-atencion',
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './detalle-atencion.component.html',
  styleUrl: './detalle-atencion.component.scss',
})
export class DetalleAtencionComponent {
  readonly datos = inject<DatosDetalleAtencion>(MAT_DIALOG_DATA);
  private readonly archivosService = inject(ArchivosService);

  readonly a = this.datos.atencion;
  readonly formatearTamano = formatearTamano;

  descargar(archivo: Archivo): void {
    this.archivosService.descargar(archivo);
  }
}
