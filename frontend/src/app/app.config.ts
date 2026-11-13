import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import {
  ErrorStateMatcher,
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
  ShowOnDirtyErrorStateMatcher,
} from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { PaginadorEspanol } from './core/paginador-espanol';

// Se registran los datos de idioma de Colombia para que los pipes de fecha y
// numero muestren "12 nov 2026" y "1.250" en vez del formato en ingles.
registerLocaleData(localeEsCo);

// Configuracion global de la aplicacion (reemplaza al antiguo AppModule).
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    // withComponentInputBinding permite recibir parametros de la URL
    // (por ejemplo :id) directamente como @Input en los componentes.
    provideRouter(routes, withComponentInputBinding()),

    // HttpClient con interceptores funcionales. El orden importa:
    // primero se agrega el token y despues se manejan los errores.
    provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),

    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },

    // Todos los campos de formulario usan el estilo "outline", que deja
    // mas claro donde escribir, y reservan espacio para los mensajes de error.
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
    },

    // Validacion en tiempo real: por defecto Material muestra el error solo
    // cuando el usuario sale del campo. Con este "matcher" el mensaje aparece
    // mientras escribe (en cuanto el campo cambia) o al intentar guardar.
    { provide: ErrorStateMatcher, useClass: ShowOnDirtyErrorStateMatcher },

    // Textos del paginador en espanol.
    { provide: MatPaginatorIntl, useClass: PaginadorEspanol },
  ],
};
