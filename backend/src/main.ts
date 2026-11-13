import { NestFactory } from '@nestjs/core';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

// Punto de entrada de la API. Aqui se crea la aplicacion NestJS y se
// configuran las opciones globales que aplican a todos los endpoints.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Todas las rutas quedan bajo /api (por ejemplo /api/auth/login).
  // Asi se distinguen facilmente de las rutas del frontend.
  app.setGlobalPrefix('api');

  // CORS: solo se permite que el frontend de Angular consuma la API.
  // Sin esto el navegador bloquea las peticiones entre puertos distintos.
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:4200'),
  });

  // ValidationPipe global: valida todos los DTO con class-validator.
  // - whitelist: elimina los campos que no estan definidos en el DTO.
  // - forbidNonWhitelisted: en vez de ignorarlos, responde error 400.
  //   Asi nadie puede enviar campos extra como "rol" o "id" a escondidas.
  // - transform: convierte los datos a los tipos del DTO (texto a numero).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Arma la respuesta de error con los mensajes de cada regla. El unico
      // mensaje que class-validator trae en ingles es el de campo no permitido
      // ("property x should not exist"), por eso ese se traduce aqui.
      exceptionFactory: (errores) =>
        new BadRequestException(
          errores.flatMap((e) =>
            Object.entries(e.constraints ?? {}).map(([regla, mensaje]) =>
              regla === 'whitelistValidation' ? `El campo "${e.property}" no está permitido.` : mensaje,
            ),
          ),
        ),
    }),
  );

  // Se asegura que la carpeta de archivos exista antes de recibir cargas.
  mkdirSync(config.get<string>('UPLOADS_DIR', './uploads'), { recursive: true });

  const puerto = config.get<number>('PORT', 3000);
  await app.listen(puerto);
  new Logger('Bootstrap').log(`API escuchando en http://localhost:${puerto}/api`);
}

bootstrap();
