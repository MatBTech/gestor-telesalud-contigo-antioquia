import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { UsuarioToken } from '../auth/interfaces/usuario-token.interface';
import { ROLES } from '../common/constantes';
import { ArchivosService } from './archivos.service';
import { opcionesMulter } from './config/multer.config';
import { SubidaArchivoFilter } from './filtros/subida-archivo.filter';
import { SubirArchivoDto } from './dto/subir-archivo.dto';

// Rutas de archivos: /api/archivos
// Todas exigen token. Los archivos contienen datos de pacientes, por eso
// NO se publican como carpeta estatica: solo se entregan por este controlador.
@Controller('archivos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  // POST /api/archivos/upload  (multipart/form-data)
  // Campos: "archivo" (el archivo) y "atencionId" (texto).
  // Los guards corren ANTES del interceptor: si no hay token, el archivo
  // nunca se llega a guardar en disco.
  @Post('upload')
  @Roles(ROLES.MEDICO_EBS, ROLES.ADMINISTRADOR)
  @UseInterceptors(FileInterceptor('archivo', opcionesMulter))
  @UseFilters(SubidaArchivoFilter)
  subir(
    @UploadedFile() archivo: Express.Multer.File,
    @Body() dto: SubirArchivoDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.archivosService.registrar(archivo, dto.atencionId, usuario);
  }

  // GET /api/archivos/download/:id
  // StreamableFile envia el archivo como stream y Nest se encarga de las
  // cabeceras. disposition "attachment" hace que el navegador lo descargue
  // con su nombre original. encodeURIComponent evita problemas con tildes.
  @Get('download/:id')
  async descargar(@Param('id', ParseIntPipe) id: number): Promise<StreamableFile> {
    const { archivo, stream } = await this.archivosService.obtenerParaDescarga(id);
    // filename lleva una version sin tildes para navegadores antiguos y
    // filename* la version completa en UTF-8 para los navegadores modernos.
    const nombreAscii = archivo.nombreOriginal.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
    return new StreamableFile(stream, {
      type: archivo.mimeType,
      length: archivo.tamano,
      disposition: `attachment; filename="${nombreAscii}"; filename*=UTF-8''${encodeURIComponent(archivo.nombreOriginal)}`,
    });
  }

  @Get('atencion/:atencionId')
  listarPorAtencion(@Param('atencionId', ParseIntPipe) atencionId: number) {
    return this.archivosService.listarPorAtencion(atencionId);
  }

  @Delete(':id')
  @Roles(ROLES.MEDICO_EBS, ROLES.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioToken) {
    return this.archivosService.eliminar(id, usuario);
  }
}
