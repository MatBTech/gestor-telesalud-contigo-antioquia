import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createReadStream, existsSync, ReadStream } from 'fs';
import { open, unlink } from 'fs/promises';
import { basename, join } from 'path';
import { Archivo, Atencion } from '../entidades';
import { ROLES } from '../common/constantes';
import { UsuarioToken } from '../auth/interfaces/usuario-token.interface';
import { carpetaUploads } from './config/multer.config';

// Maximo de archivos por atencion, para que nadie llene el disco
// subiendo cientos de fotos a un mismo registro.
const MAXIMO_ARCHIVOS_POR_ATENCION = 10;

@Injectable()
export class ArchivosService {
  private readonly logger = new Logger(ArchivosService.name);

  constructor(
    @InjectRepository(Archivo) private readonly archivosRepo: Repository<Archivo>,
    @InjectRepository(Atencion) private readonly atencionesRepo: Repository<Atencion>,
  ) {}

  // Registra en la base de datos un archivo que Multer ya guardo en disco.
  // Si alguna validacion falla, se lanza la excepcion y el filtro
  // SubidaArchivoFilter se encarga de borrar el archivo del disco.
  async registrar(archivo: Express.Multer.File, atencionId: number, usuario: UsuarioToken): Promise<Archivo> {
    if (!archivo) {
      throw new BadRequestException('Debe adjuntar un archivo PDF, JPG o PNG.');
    }

    const atencion = await this.atencionesRepo.findOne({ where: { id: atencionId } });
    if (!atencion) {
      throw new NotFoundException('La atención indicada no existe.');
    }
    // El medico solo puede adjuntar soportes a sus propias atenciones.
    if (usuario.rol !== ROLES.ADMINISTRADOR && atencion.registradoPorId !== usuario.id) {
      throw new ForbiddenException('Solo puede adjuntar archivos a las atenciones que usted registró.');
    }

    const cantidad = await this.archivosRepo.count({ where: { atencionId } });
    if (cantidad >= MAXIMO_ARCHIVOS_POR_ATENCION) {
      throw new BadRequestException(
        `La atención ya tiene ${MAXIMO_ARCHIVOS_POR_ATENCION} archivos, que es el máximo permitido.`,
      );
    }

    // Revision del contenido real del archivo (ver metodo mas abajo).
    await this.validarFirmaArchivo(archivo.path, archivo.mimetype);

    const registro = this.archivosRepo.create({
      // Multer lee el nombre original como latin1; esta conversion corrige
      // las tildes y la enie (por ejemplo "Acta_Muñoz.pdf").
      nombreOriginal: Buffer.from(archivo.originalname, 'latin1').toString('utf8'),
      nombreGuardado: archivo.filename,
      mimeType: archivo.mimetype,
      tamano: archivo.size,
      atencionId,
      subidoPorId: usuario.id,
    });
    return this.archivosRepo.save(registro);
  }

  listarPorAtencion(atencionId: number): Promise<Archivo[]> {
    return this.archivosRepo.find({ where: { atencionId }, order: { subidoEn: 'DESC' } });
  }

  // Prepara la descarga: busca el registro y abre el archivo como stream.
  // Un stream envia el archivo por partes sin cargarlo completo en memoria.
  async obtenerParaDescarga(id: number): Promise<{ archivo: Archivo; stream: ReadStream }> {
    const archivo = await this.archivosRepo.findOne({ where: { id } });
    if (!archivo) {
      throw new NotFoundException('El archivo solicitado no existe.');
    }
    const ruta = this.rutaFisica(archivo.nombreGuardado);
    if (!existsSync(ruta)) {
      throw new NotFoundException('El archivo ya no se encuentra en el servidor.');
    }
    return { archivo, stream: createReadStream(ruta) };
  }

  async eliminar(id: number, usuario: UsuarioToken): Promise<{ mensaje: string }> {
    const archivo = await this.archivosRepo.findOne({ where: { id } });
    if (!archivo) {
      throw new NotFoundException('El archivo solicitado no existe.');
    }
    if (usuario.rol !== ROLES.ADMINISTRADOR && archivo.subidoPorId !== usuario.id) {
      throw new ForbiddenException('Solo puede eliminar los archivos que usted subió.');
    }
    await this.eliminarArchivosFisicos([archivo]);
    await this.archivosRepo.remove(archivo);
    return { mensaje: 'Archivo eliminado.' };
  }

  // Borra del disco los archivos indicados. Lo usa tambien AtencionesService.
  // Si un archivo ya no existe no se detiene el proceso, solo se registra.
  async eliminarArchivosFisicos(archivos: Archivo[]): Promise<void> {
    for (const archivo of archivos) {
      await unlink(this.rutaFisica(archivo.nombreGuardado)).catch(() =>
        this.logger.warn(`No se encontro en disco el archivo ${archivo.nombreGuardado}`),
      );
    }
  }

  // basename() deja solo el nombre del archivo y quita cualquier carpeta.
  // Es una proteccion extra contra rutas maliciosas como "../../.env".
  private rutaFisica(nombreGuardado: string): string {
    return join(carpetaUploads(), basename(nombreGuardado));
  }

  // Valida la "firma" (los primeros bytes) del archivo.
  // El tipo MIME lo envia el navegador y se puede falsificar: alguien podria
  // renombrar un .exe como .pdf. Los primeros bytes, en cambio, son propios
  // del formato real del archivo:
  //   PDF -> %PDF          (25 50 44 46)
  //   PNG -> .PNG          (89 50 4E 47)
  //   JPG -> FF D8 FF
  private async validarFirmaArchivo(ruta: string, mimeType: string): Promise<void> {
    const descriptor = await open(ruta, 'r');
    const cabecera = Buffer.alloc(4);
    try {
      await descriptor.read(cabecera, 0, 4, 0);
    } finally {
      await descriptor.close();
    }

    const firmas: Record<string, number[]> = {
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
      'image/png': [0x89, 0x50, 0x4e, 0x47],
      'image/jpeg': [0xff, 0xd8, 0xff],
    };
    const esperada = firmas[mimeType];
    const coincide = esperada && esperada.every((byte, i) => cabecera[i] === byte);
    if (!coincide) {
      throw new BadRequestException(
        'El contenido del archivo no corresponde a un PDF, JPG o PNG válido. Verifique que el archivo no esté dañado.',
      );
    }
  }
}
