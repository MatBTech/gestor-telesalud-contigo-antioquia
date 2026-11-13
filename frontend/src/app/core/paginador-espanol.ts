import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

// Traduccion de los textos del paginador de Angular Material, que por
// defecto vienen en ingles ("Items per page", "1 - 10 of 50").
@Injectable()
export class PaginadorEspanol extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Registros por pagina:';
  override nextPageLabel = 'Pagina siguiente';
  override previousPageLabel = 'Pagina anterior';
  override firstPageLabel = 'Primera pagina';
  override lastPageLabel = 'Ultima pagina';

  override getRangeLabel = (pagina: number, tamano: number, total: number): string => {
    if (total === 0) return '0 de 0';
    const inicio = pagina * tamano + 1;
    const fin = Math.min(inicio + tamano - 1, total);
    return `${inicio} - ${fin} de ${total}`;
  };
}
