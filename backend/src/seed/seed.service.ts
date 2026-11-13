import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Rol, Usuario } from '../entidades';
import { ROLES } from '../common/constantes';

// Servicio de datos iniciales.
// Se ejecuta automaticamente cuando la aplicacion termina de arrancar
// (OnApplicationBootstrap). Crea los tres roles y un primer administrador.
// Sin esto nadie podria entrar, porque registrar usuarios requiere ser
// administrador.
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Rol) private readonly rolesRepo: Repository<Rol>,
    @InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.crearRoles();
    await this.crearAdministrador();
  }

  // Inserta cada rol solo si todavia no existe, asi se puede ejecutar
  // muchas veces sin duplicar registros.
  private async crearRoles() {
    const roles = [
      { nombre: ROLES.ADMINISTRADOR, descripcion: 'Gestiona usuarios y toda la información del sistema' },
      { nombre: ROLES.COORDINADOR, descripcion: 'Gestiona municipios, kits y consulta estadísticas' },
      { nombre: ROLES.MEDICO_EBS, descripcion: 'Médico del Equipo Básico de Salud, registra atenciones' },
    ];
    for (const rol of roles) {
      const existe = await this.rolesRepo.findOne({ where: { nombre: rol.nombre } });
      if (!existe) {
        await this.rolesRepo.save(this.rolesRepo.create(rol));
        this.logger.log(`Rol creado: ${rol.nombre}`);
      }
    }
  }

  // Crea el administrador inicial solo si no hay ningun administrador.
  private async crearAdministrador() {
    const rolAdmin = await this.rolesRepo.findOneByOrFail({ nombre: ROLES.ADMINISTRADOR });
    const totalAdmins = await this.usuariosRepo.count({ where: { rol: { id: rolAdmin.id } } });
    if (totalAdmins > 0) return;

    const correo = this.config.get<string>('ADMIN_CORREO', 'admin@telesalud.local').toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD', 'Admin12345');
    await this.usuariosRepo.save(
      this.usuariosRepo.create({
        nombreCompleto: this.config.get<string>('ADMIN_NOMBRE', 'Administrador General'),
        correo,
        password: await bcrypt.hash(password, 10),
        rol: rolAdmin,
      }),
    );
    this.logger.warn(`Administrador inicial creado (${correo}). Cambie la contraseña después del primer ingreso.`);
  }
}
