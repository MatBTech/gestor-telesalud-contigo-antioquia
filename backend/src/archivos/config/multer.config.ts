import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Tipos de archivo permitidos: actas en PDF y fotografias JPG o PNG.
// Se revisa el tipo MIME y tambien la extension, porque cualquiera de los
// dos por separado se puede falsificar facilmente.
export const TIPOS_PERMITIDOS: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

// 5 MB expresados en bytes.
export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

// Carpeta donde se guardan los archivos. Es una funcion y no una constante
// porque este archivo se carga antes de que ConfigModule lea el .env; asi
// el valor se consulta en el momento de usarlo y ya esta disponible.
export const carpetaUploads = (): string => process.env.UPLOADS_DIR || './uploads';

// Configuracion de Multer, la libreria que procesa los formularios
// multipart/form-data (los que llevan archivos).
export const opcionesMulter: MulterOptions = {
  // diskStorage guarda el archivo directamente en disco y no en memoria,
  // asi un archivo grande no llena la RAM del servidor.
  storage: diskStorage({
    destination: (_req, _archivo, callback) => callback(null, carpetaUploads()),
    // Nombre aleatorio + extension original en minusculas.
    // Nunca se usa el nombre que manda el usuario, porque podria traer
    // caracteres peligrosos como "../" para escribir fuera de la carpeta.
    filename: (_req, archivo, callback) => {
      callback(null, `${randomUUID()}${extname(archivo.originalname).toLowerCase()}`);
    },
  }),

  // fileFilter se ejecuta ANTES de guardar. Si el tipo no es valido el
  // archivo ni siquiera se escribe en disco.
  fileFilter: (_req, archivo, callback) => {
    const extension = extname(archivo.originalname).toLowerCase();
    const extensionesValidas = TIPOS_PERMITIDOS[archivo.mimetype];
    if (!extensionesValidas || !extensionesValidas.includes(extension)) {
      return callback(
        new BadRequestException('Tipo de archivo no permitido. Solo se aceptan archivos PDF, JPG o PNG.'),
        false,
      );
    }
    callback(null, true);
  },

  // Limites: un solo archivo por peticion y maximo 5 MB.
  limits: {
    fileSize: TAMANO_MAXIMO_BYTES,
    files: 1,
  },
};
