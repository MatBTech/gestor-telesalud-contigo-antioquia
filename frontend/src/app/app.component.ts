import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Componente raiz. Solo contiene el router-outlet: lo que se muestra
// (login o el layout con menu) lo decide la configuracion de rutas.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {}
