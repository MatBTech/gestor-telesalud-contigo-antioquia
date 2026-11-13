import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { Request, Response } from 'express';
import { TAMANO_MAXIMO_BYTES } from '../config/multer.config';

// Filtro de excepciones solo para el endpoint de carga.
// Resuelve dos problemas:
// 1. Multer guarda el archivo ANTES de que corran las validaciones del body
//    (por ejemplo atencionId invalido). Si algo falla despues, el archivo
//    quedaria huerfano en ./uploads. Este filtro lo borra.
// 2. Cuando el archivo supera el limite, Multer responde en ingles
//    ("File too large"). Aqui se cambia por un mensaje en espanol.
@Catch(HttpException)
export class SubidaArchivoFilter implements ExceptionFilter {
  private readonly logger = new Logger(SubidaArchivoFilter.name);

  async catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { file?: Express.Multer.File }>();
    const response = ctx.getResponse<Response>();

    // Si alcanzo a guardarse un archivo, se elimina.
    if (request.file?.path) {
      await unlink(request.file.path).catch(() =>
        this.logger.warn(`No se pudo borrar el archivo temporal ${request.file?.path}`),
      );
    }

    if (exception instanceof PayloadTooLargeException) {
      const mb = TAMANO_MAXIMO_BYTES / (1024 * 1024);
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: `El archivo supera el tamaño máximo permitido de ${mb} MB.`,
        error: 'Payload Too Large',
      });
      return;
    }

    // Para cualquier otro error se responde igual que lo haria Nest.
    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
