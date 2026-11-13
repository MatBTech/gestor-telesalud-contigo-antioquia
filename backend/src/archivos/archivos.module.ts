import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Archivo, Atencion } from '../entidades';
import { ArchivosController } from './archivos.controller';
import { ArchivosService } from './archivos.service';

// Modulo de archivos. Exporta el servicio porque AtencionesModule lo usa
// para borrar los archivos fisicos al eliminar una atencion.
@Module({
  imports: [TypeOrmModule.forFeature([Archivo, Atencion])],
  controllers: [ArchivosController],
  providers: [ArchivosService],
  exports: [ArchivosService],
})
export class ArchivosModule {}
