import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENTIDADES } from './entidades';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { MunicipiosModule } from './municipios/municipios.module';
import { AtencionesModule } from './atenciones/atenciones.module';
import { KitsModule } from './kits/kits.module';
import { ArchivosModule } from './archivos/archivos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SeedModule } from './seed/seed.module';

// Modulo raiz: une la configuracion, la base de datos y todos los modulos
// funcionales del sistema.
@Module({
  imports: [
    // ConfigModule lee el archivo .env. isGlobal evita tener que importarlo
    // en cada modulo que necesite una variable de entorno.
    ConfigModule.forRoot({ isGlobal: true }),

    // Se usa forRootAsync para poder leer los datos de conexion desde
    // ConfigService en vez de escribirlos directamente en el codigo.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5432)),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'telesalud_antioquia'),
        entities: ENTIDADES,
        // synchronize crea y actualiza las tablas segun las entidades.
        // Es comodo en desarrollo, pero en produccion se desactiva porque
        // podria borrar columnas con datos reales.
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    AuthModule,
    UsuariosModule,
    MunicipiosModule,
    AtencionesModule,
    KitsModule,
    ArchivosModule,
    DashboardModule,
    SeedModule,
  ],
})
export class AppModule {}
