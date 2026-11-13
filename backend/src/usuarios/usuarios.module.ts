import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol, Usuario } from '../entidades';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

// Modulo de usuarios. Exporta el servicio porque AuthModule lo usa para
// el registro.
@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
