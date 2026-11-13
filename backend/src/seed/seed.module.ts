import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol, Usuario } from '../entidades';
import { SeedService } from './seed.service';

// Modulo que carga los datos minimos para que el sistema funcione.
@Module({
  imports: [TypeOrmModule.forFeature([Rol, Usuario])],
  providers: [SeedService],
})
export class SeedModule {}
