import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Atencion, Kit, Municipio } from '../entidades';
import { MunicipiosController } from './municipios.controller';
import { MunicipiosService } from './municipios.service';
import { NominatimService } from './nominatim.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Municipio, Atencion, Kit]),
    // HttpModule entrega el HttpService (basado en axios) para consumir
    // Nominatim. El timeout evita que la peticion quede colgada si la API
    // externa no responde; a los 8 segundos se pasa al ingreso manual.
    HttpModule.register({ timeout: 8000, maxRedirects: 3 }),
  ],
  controllers: [MunicipiosController],
  providers: [MunicipiosService, NominatimService],
})
export class MunicipiosModule {}
