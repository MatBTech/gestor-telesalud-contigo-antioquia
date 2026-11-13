import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Atencion, Municipio } from '../entidades';
import { ROLES } from '../common/constantes';
import { UsuarioToken } from '../auth/interfaces/usuario-token.interface';
import { ArchivosService } from '../archivos/archivos.service';
import { CrearAtencionDto } from './dto/crear-atencion.dto';
import { ActualizarAtencionDto } from './dto/actualizar-atencion.dto';
import { FiltroAtencionesDto } from './dto/filtro-atenciones.dto';

@Injectable()
export class AtencionesService {
  constructor(
    @InjectRepository(Atencion) private readonly atencionesRepo: Repository<Atencion>,
    @InjectRepository(Municipio) private readonly municipiosRepo: Repository<Municipio>,
    private readonly archivosService: ArchivosService,
  ) {}

  async crear(dto: CrearAtencionDto, usuario: UsuarioToken): Promise<Atencion> {
    await this.validarMunicipio(dto.municipioId);
    const fecha = this.validarFecha(dto.fechaAtencion);

    const atencion = this.atencionesRepo.create({
      nombrePaciente: dto.nombrePaciente,
      especialidad: dto.especialidad,
      municipioId: dto.municipioId,
      motivoConsulta: dto.motivoConsulta,
      resueltoEnTerritorio: dto.resueltoEnTerritorio,
      fechaAtencion: fecha ?? new Date(),
      // Se guarda quien registro la atencion, tomado del token y no del body,
      // para que nadie pueda registrar a nombre de otra persona.
      registradoPorId: usuario.id,
    });
    const guardada = await this.atencionesRepo.save(atencion);
    return this.obtener(guardada.id);
  }

  // Listado con filtros opcionales y paginacion.
  async listar(filtro: FiltroAtencionesDto) {
    const consulta = this.atencionesRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.municipio', 'm')
      .leftJoinAndSelect('a.archivos', 'ar')
      // Del usuario que registro solo se traen id y nombre (nada sensible).
      .leftJoin('a.registradoPor', 'u')
      .addSelect(['u.id', 'u.nombreCompleto'])
      .orderBy('a.fechaAtencion', 'DESC')
      .addOrderBy('a.id', 'DESC');

    // Cada filtro se agrega solo si viene. Se usan parametros (:valor) y no
    // concatenacion de texto, para evitar inyeccion SQL.
    if (filtro.municipioId) {
      consulta.andWhere('a.municipioId = :municipioId', { municipioId: filtro.municipioId });
    }
    if (filtro.especialidad) {
      consulta.andWhere('a.especialidad = :especialidad', { especialidad: filtro.especialidad });
    }
    if (filtro.resueltoEnTerritorio !== undefined) {
      consulta.andWhere('a.resueltoEnTerritorio = :resuelto', { resuelto: filtro.resueltoEnTerritorio });
    }

    const pagina = filtro.pagina ?? 1;
    const limite = filtro.limite ?? 10;
    // skip/take son la version de TypeORM de OFFSET/LIMIT que funciona bien
    // aunque haya joins.
    const [datos, total] = await consulta
      .skip((pagina - 1) * limite)
      .take(limite)
      .getManyAndCount();

    return { datos, total, pagina, limite };
  }

  async obtener(id: number): Promise<Atencion> {
    const atencion = await this.atencionesRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.municipio', 'm')
      .leftJoinAndSelect('a.archivos', 'ar')
      .leftJoin('a.registradoPor', 'u')
      .addSelect(['u.id', 'u.nombreCompleto'])
      .where('a.id = :id', { id })
      .getOne();
    if (!atencion) {
      throw new NotFoundException(`No existe una atención con id ${id}.`);
    }
    return atencion;
  }

  async actualizar(id: number, dto: ActualizarAtencionDto, usuario: UsuarioToken): Promise<Atencion> {
    const atencion = await this.obtener(id);
    this.validarPropietario(atencion, usuario);

    if (dto.municipioId) {
      await this.validarMunicipio(dto.municipioId);
      atencion.municipioId = dto.municipioId;
      // Se quita la relacion cargada para que TypeORM use el nuevo municipioId.
      delete (atencion as Partial<Atencion>).municipio;
    }
    const fecha = this.validarFecha(dto.fechaAtencion);
    if (fecha) atencion.fechaAtencion = fecha;
    if (dto.nombrePaciente !== undefined) atencion.nombrePaciente = dto.nombrePaciente;
    if (dto.especialidad !== undefined) atencion.especialidad = dto.especialidad;
    if (dto.motivoConsulta !== undefined) atencion.motivoConsulta = dto.motivoConsulta;
    if (dto.resueltoEnTerritorio !== undefined) atencion.resueltoEnTerritorio = dto.resueltoEnTerritorio;

    // Se quitan los archivos cargados para que save() no intente tocarlos.
    delete (atencion as Partial<Atencion>).archivos;
    await this.atencionesRepo.save(atencion);
    return this.obtener(id);
  }

  // Elimina la atencion y tambien sus archivos fisicos. Los registros de la
  // tabla archivos se borran solos por el onDelete CASCADE, pero los
  // archivos en disco hay que borrarlos a mano o quedarian ocupando espacio.
  async eliminar(id: number): Promise<{ mensaje: string }> {
    const atencion = await this.obtener(id);
    await this.archivosService.eliminarArchivosFisicos(atencion.archivos ?? []);
    await this.atencionesRepo.delete(id);
    return { mensaje: 'Atención eliminada correctamente.' };
  }

  private async validarMunicipio(municipioId: number) {
    const existe = await this.municipiosRepo.exists({ where: { id: municipioId } });
    if (!existe) {
      throw new NotFoundException('El municipio seleccionado no existe.');
    }
  }

  // No se permiten fechas futuras ni muy antiguas (errores de digitacion
  // tipicos como escribir 2052 en vez de 2025, o 1925).
  private validarFecha(fechaTexto?: string): Date | null {
    if (!fechaTexto) return null;
    const fecha = new Date(fechaTexto);
    const ahora = new Date();
    // Se da un margen de 5 minutos por diferencias de reloj entre equipos.
    if (fecha.getTime() > ahora.getTime() + 5 * 60 * 1000) {
      throw new BadRequestException('La fecha de atención no puede ser una fecha futura.');
    }
    const haceUnAnio = new Date();
    haceUnAnio.setFullYear(ahora.getFullYear() - 1);
    if (fecha < haceUnAnio) {
      throw new BadRequestException('La fecha de atención no puede tener más de un año de antigüedad.');
    }
    return fecha;
  }

  // El medico solo puede editar las atenciones que el mismo registro.
  // El administrador puede editar cualquiera.
  private validarPropietario(atencion: Atencion, usuario: UsuarioToken) {
    if (usuario.rol === ROLES.ADMINISTRADOR) return;
    if (atencion.registradoPorId !== usuario.id) {
      throw new ForbiddenException('Solo puede modificar las atenciones que usted registró.');
    }
  }
}
