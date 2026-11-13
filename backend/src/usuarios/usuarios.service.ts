import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Rol, Usuario } from '../entidades';
import { RegisterDto } from '../auth/dto/register.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';

// Numero de rondas de bcrypt. 10 es el valor recomendado: es lo bastante
// lento para frenar ataques de fuerza bruta sin hacer lento el login.
const RONDAS_BCRYPT = 10;

// Servicio con la logica de negocio de los usuarios.
@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(Rol) private readonly rolesRepo: Repository<Rol>,
  ) {}

  // Crea un usuario. Lo usa el endpoint /auth/register.
  async crear(dto: RegisterDto): Promise<Usuario> {
    // Se revisa antes de insertar para dar un mensaje claro. Si solo se
    // dependiera del indice unico, el error de PostgreSQL seria confuso.
    const existe = await this.usuariosRepo.exists({ where: { correo: dto.correo } });
    if (existe) {
      throw new ConflictException('Ya existe un usuario registrado con ese correo.');
    }

    const rol = await this.buscarRol(dto.rol);
    const usuario = this.usuariosRepo.create({
      nombreCompleto: dto.nombreCompleto,
      correo: dto.correo,
      // Nunca se guarda la contrasena en texto plano, solo su hash.
      password: await bcrypt.hash(dto.password, RONDAS_BCRYPT),
      rol,
    });
    const guardado = await this.usuariosRepo.save(usuario);

    // Se vuelve a consultar para que la respuesta NO incluya el hash
    // (la consulta normal no trae password por el select: false).
    return this.obtener(guardado.id);
  }

  listar(): Promise<Usuario[]> {
    return this.usuariosRepo.find({ order: { nombreCompleto: 'ASC' } });
  }

  listarRoles(): Promise<Rol[]> {
    return this.rolesRepo.find({ order: { id: 'ASC' } });
  }

  async obtener(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`No existe un usuario con id ${id}.`);
    }
    return usuario;
  }

  // Actualiza datos del usuario. Recibe el id de quien hace el cambio para
  // evitar que un administrador se bloquee a si mismo por error.
  async actualizar(id: number, dto: ActualizarUsuarioDto, idUsuarioActual: number): Promise<Usuario> {
    const usuario = await this.obtener(id);

    if (id === idUsuarioActual) {
      if (dto.activo === false) {
        throw new BadRequestException('No puede desactivar su propio usuario.');
      }
      if (dto.rol && dto.rol !== usuario.rol.nombre) {
        throw new BadRequestException('No puede cambiar su propio rol.');
      }
    }

    if (dto.nombreCompleto !== undefined) usuario.nombreCompleto = dto.nombreCompleto;
    if (dto.activo !== undefined) usuario.activo = dto.activo;
    if (dto.rol) usuario.rol = await this.buscarRol(dto.rol);
    if (dto.password) usuario.password = await bcrypt.hash(dto.password, RONDAS_BCRYPT);

    await this.usuariosRepo.save(usuario);
    return this.obtener(id);
  }

  // El propio usuario cambia su nombre desde "Mi perfil".
  async actualizarPerfil(id: number, nombreCompleto: string): Promise<Usuario> {
    const usuario = await this.obtener(id);
    usuario.nombreCompleto = nombreCompleto;
    await this.usuariosRepo.save(usuario);
    return this.obtener(id);
  }

  // El propio usuario cambia su contrasena. Se verifica la actual con bcrypt
  // y se exige que la nueva sea distinta, para que el cambio tenga sentido.
  async cambiarPassword(id: number, passwordActual: string, passwordNueva: string): Promise<{ mensaje: string }> {
    // password tiene select: false, por eso se pide de forma explicita.
    const usuario = await this.usuariosRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id })
      .getOne();
    if (!usuario) {
      throw new NotFoundException(`No existe un usuario con id ${id}.`);
    }
    if (!(await bcrypt.compare(passwordActual, usuario.password))) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }
    if (await bcrypt.compare(passwordNueva, usuario.password)) {
      throw new BadRequestException('La contraseña nueva debe ser diferente a la actual.');
    }
    // update() en lugar de save() para tocar solo la columna password.
    await this.usuariosRepo.update(id, { password: await bcrypt.hash(passwordNueva, RONDAS_BCRYPT) });
    return { mensaje: 'Contraseña actualizada correctamente.' };
  }

  // Busca el rol por nombre. Aunque el DTO ya valida la lista, el rol
  // tambien debe existir en la base de datos.
  private async buscarRol(nombre: string): Promise<Rol> {
    const rol = await this.rolesRepo.findOne({ where: { nombre } });
    if (!rol) {
      throw new BadRequestException(`El rol "${nombre}" no existe en la base de datos.`);
    }
    return rol;
  }
}
