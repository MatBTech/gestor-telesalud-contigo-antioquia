import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Punto de entrada del frontend. Arranca el componente raiz con la
// configuracion definida en app.config.ts (sin NgModule, estilo standalone).
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
