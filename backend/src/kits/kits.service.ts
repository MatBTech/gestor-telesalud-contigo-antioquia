import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kit, Municipio } from '../entidades';
import { CrearKitDto } from './dto/crear-kit.dto';
import { ActualizarKitDto } from './dto/actualizar-kit.dto';
import { CambiarEstadoKitDto } from './dto/cambiar-estado-kit.dto';
import { FiltroKitsDto } from './dto/filtro-kits.dto';

@Injectable()
export class KitsService {
  constructor(
    @InjectRepository(Kit) private readonly kitsRepo: Repository<Kit>,
    @InjectRepository(Municipio) private readonly municipiosRepo: Repository<Municipio>,
  ) {}

  async crear(dto: CrearKitDto): Promise<Kit> {
    const existe = await this.kitsRepo.exists({ where: { codigo: dto.codigo } });
    if (existe) {
      throw new ConflictException(`Ya existe un kit con el código ${dto.codigo}.`);
    }

    const kit = this.kitsRepo.create({
      codigo: dto.codigo,
      descripcion: dto.descripcion ?? null,
      estado: 'disponible',
    });

    // Si viene municipio, el kit nace asignado.
    if (dto.municipioId) {
      await this.validarMunicipio(dto.municipioId);
      kit.estado = 'asignado';
      kit.municipioId = dto.municipioId;
      kit.fechaAsignacion = new Date();
    }

    const guardado = await this.kitsRepo.save(kit);
    return this.obtener(guardado.id);
  }

  listar(filtro: FiltroKitsDto): Promise<Kit[]> {
    const consulta = this.kitsRepo
      .createQueryBuilder('k')
      .leftJoinAndSelect('k.municipio', 'm')
      .orderBy('k.codigo', 'ASC');
    if (filtro.estado) consulta.andWhere('k.estado = :estado', { estado: filtro.estado });
    if (filtro.municipioId) consulta.andWhere('k.municipioId = :mid', { mid: filtro.municipioId });
    return consulta.getMany();
  }

  async obtener(id: number): Promise<Kit> {
    const kit = await this.kitsRepo.findOne({ where: { id }, relations: { municipio: true } });
    if (!kit) {
      throw new NotFoundException(`No existe un kit con id ${id}.`);
    }
    return kit;
  }

  // Cambio de estado con reglas de negocio:
  // - Un kit dado de baja ya no puede cambiar (es un estado final).
  // - Para pasar a 'asignado' es obligatorio indicar el municipio.
  // - En cualquier otro estado el kit vuelve a bodega, sin municipio.
  // - No se permite "cambiar" al mismo estado, para evitar clics repetidos.
  async cambiarEstado(id: number, dto: CambiarEstadoKitDto): Promise<Kit> {
    const kit = await this.obtener(id);

    if (kit.estado === 'dado_de_baja') {
      throw new BadRequestException('Un kit dado de baja no puede cambiar de estado.');
    }

    if (dto.estado === 'asignado') {
      if (!dto.municipioId) {
        throw new BadRequestException('Para asignar el kit debe seleccionar un municipio.');
      }
      if (kit.estado === 'asignado' && kit.municipioId === dto.municipioId) {
        throw new BadRequestException('El kit ya está asignado a ese municipio.');
      }
      await this.validarMunicipio(dto.municipioId);
      kit.municipioId = dto.municipioId;
      kit.fechaAsignacion = new Date();
    } else {
      if (kit.estado === dto.estado) {
        throw new BadRequestException('El kit ya se encuentra en ese estado.');
      }
      kit.municipioId = null;
      kit.fechaAsignacion = null;
    }

    kit.estado = dto.estado;
    // Se borra la relacion cargada para que TypeORM tome el municipioId nuevo.
    delete (kit as Partial<Kit>).municipio;
    await this.kitsRepo.save(kit);
    return this.obtener(id);
  }

  // Edita codigo y descripcion. Un kit dado de baja no se modifica porque
  // es un estado final y su registro debe quedar tal como estaba.
  async actualizar(id: number, dto: ActualizarKitDto): Promise<Kit> {
    const kit = await this.obtener(id);
    if (kit.estado === 'dado_de_baja') {
      throw new BadRequestException('Un kit dado de baja no puede editarse.');
    }
    if (dto.codigo && dto.codigo !== kit.codigo) {
      const existe = await this.kitsRepo.exists({ where: { codigo: dto.codigo } });
      if (existe) {
        throw new ConflictException(`Ya existe un kit con el código ${dto.codigo}.`);
      }
      kit.codigo = dto.codigo;
    }
    if (dto.descripcion !== undefined) {
      kit.descripcion = dto.descripcion || null;
    }
    await this.kitsRepo.save(kit);
    return this.obtener(id);
  }

  // No se deja borrar un kit asignado: primero hay que retirarlo del
  // municipio. Asi el inventario fisico y el sistema no se desajustan.
  async eliminar(id: number): Promise<{ mensaje: string }> {
    const kit = await this.obtener(id);
    if (kit.estado === 'asignado') {
      throw new ConflictException('No se puede eliminar un kit asignado. Cambie primero su estado.');
    }
    await this.kitsRepo.remove(kit);
    return { mensaje: `Kit ${kit.codigo} eliminado.` };
  }

  private async validarMunicipio(municipioId: number) {
    const existe = await this.municipiosRepo.exists({ where: { id: municipioId } });
    if (!existe) {
      throw new NotFoundException('El municipio seleccionado no existe.');
    }
  }
}
