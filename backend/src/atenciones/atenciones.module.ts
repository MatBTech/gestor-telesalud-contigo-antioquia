import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Atencion, Municipio } from '../entidades';
import { ArchivosModule } from '../archivos/archivos.module';
import { AtencionesController } from './atenciones.controller';
import { AtencionesService } from './atenciones.service';

// Se importa ArchivosModule para poder borrar los archivos fisicos cuando
// se elimina una atencion.
@Module({
  imports: [TypeOrmModule.forFeature([Atencion, Municipio]), ArchivosModule],
  controllers: [AtencionesController],
  providers: [AtencionesService],
})
export class AtencionesModule {}
