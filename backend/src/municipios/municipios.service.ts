import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Atencion, Kit, Municipio } from '../entidades';
import { CrearMunicipioDto } from './dto/crear-municipio.dto';
import { ActualizarMunicipioDto } from './dto/actualizar-municipio.dto';
import { NominatimService } from './nominatim.service';

// Codigo que el frontend reconoce para mostrar los campos de coordenadas
// manuales cuando Nominatim falla.
export const CODIGO_GEOCODIFICACION_FALLIDA = 'GEOCODIFICACION_FALLIDA';

@Injectable()
export class MunicipiosService {
  constructor(
    @InjectRepository(Municipio) private readonly municipiosRepo: Repository<Municipio>,
    @InjectRepository(Atencion) private readonly atencionesRepo: Repository<Atencion>,
    @InjectRepository(Kit) private readonly kitsRepo: Repository<Kit>,
    private readonly nominatim: NominatimService,
  ) {}

  // Crea un municipio. Flujo:
  // 1. Revisa que el nombre no este repetido.
  // 2. Si vienen latitud y longitud, se usan (ingreso manual).
  // 3. Si no vienen, se consulta Nominatim.
  // 4. Si Nominatim falla, responde 422 con un codigo especial para que el
  //    frontend le pida las coordenadas al usuario.
  async crear(dto: CrearMunicipioDto): Promise<Municipio> {
    this.validarParCoordenadas(dto.latitud, dto.longitud);
    await this.validarNombreUnico(dto.nombre);

    let latitud = dto.latitud ?? null;
    let longitud = dto.longitud ?? null;
    let origen = 'manual';
    let subregion = dto.subregion;

    if (latitud === null || longitud === null) {
      const resultado = await this.nominatim.buscarCoordenadas(dto.nombre);
      if (!resultado) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          codigo: CODIGO_GEOCODIFICACION_FALLIDA,
          message:
            'No fue posible obtener las coordenadas automáticamente desde OpenStreetMap. Ingrese la latitud y la longitud de forma manual.',
        });
      }
      latitud = resultado.latitud;
      longitud = resultado.longitud;
      origen = 'nominatim';
      // Si OpenStreetMap ubica el municipio en otra subregion, manda la del
      // mapa: es la que corresponde a las coordenadas que se guardan.
      subregion = resultado.subregion ?? dto.subregion;
    }

    const municipio = this.municipiosRepo.create({
      nombre: dto.nombre,
      subregion,
      latitud,
      longitud,
      origenCoordenadas: origen,
    });
    return this.municipiosRepo.save(municipio);
  }

  // Consulta Nominatim sin guardar nada. El frontend la usa para mostrar
  // una vista previa de las coordenadas antes de crear el municipio.
  async geocodificar(nombre: string) {
    const limpio = (nombre ?? '').trim();
    if (limpio.length < 2) {
      throw new BadRequestException('Escriba el nombre del municipio (mínimo 2 caracteres).');
    }
    const resultado = await this.nominatim.buscarCoordenadas(limpio);
    if (!resultado) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        codigo: CODIGO_GEOCODIFICACION_FALLIDA,
        message: 'No se encontraron coordenadas para ese municipio. Puede ingresarlas manualmente.',
      });
    }
    return resultado;
  }

  // Lista los municipios con el numero de atenciones y de kits asignados.
  // loadRelationCountAndMap agrega esos conteos sin traer todas las filas.
  listar(): Promise<Municipio[]> {
    return this.municipiosRepo
      .createQueryBuilder('m')
      .loadRelationCountAndMap('m.totalAtenciones', 'm.atenciones')
      .loadRelationCountAndMap('m.totalKits', 'm.kits', 'k', (qb) =>
        qb.where('k.estado = :estado', { estado: 'asignado' }),
      )
      .orderBy('m.nombre', 'ASC')
      .getMany();
  }

  async obtener(id: number): Promise<Municipio> {
    const municipio = await this.municipiosRepo.findOne({ where: { id } });
    if (!municipio) {
      throw new NotFoundException(`No existe un municipio con id ${id}.`);
    }
    return municipio;
  }

  async actualizar(id: number, dto: ActualizarMunicipioDto): Promise<Municipio> {
    const municipio = await this.obtener(id);
    this.validarParCoordenadas(dto.latitud, dto.longitud);

    if (dto.nombre && dto.nombre.toLowerCase() !== municipio.nombre.toLowerCase()) {
      await this.validarNombreUnico(dto.nombre);
      municipio.nombre = dto.nombre;
    }
    if (dto.subregion) municipio.subregion = dto.subregion;
    if (dto.latitud !== undefined && dto.longitud !== undefined) {
      municipio.latitud = dto.latitud;
      municipio.longitud = dto.longitud;
      municipio.origenCoordenadas = 'manual';
    }
    return this.municipiosRepo.save(municipio);
  }

  // Solo se puede borrar un municipio sin atenciones ni kits, para no
  // perder informacion historica. Se avisa con un mensaje claro en lugar
  // de dejar que falle la llave foranea.
  async eliminar(id: number): Promise<{ mensaje: string }> {
    const municipio = await this.obtener(id);
    const atenciones = await this.atencionesRepo.count({ where: { municipioId: id } });
    const kits = await this.kitsRepo.count({ where: { municipioId: id } });
    if (atenciones > 0 || kits > 0) {
      throw new ConflictException(
        `No se puede eliminar ${municipio.nombre}: tiene ${atenciones} atención(es) y ${kits} kit(s) asociados.`,
      );
    }
    await this.municipiosRepo.remove(municipio);
    return { mensaje: `Municipio ${municipio.nombre} eliminado.` };
  }

  // La latitud y la longitud van juntas: no tiene sentido una sin la otra.
  private validarParCoordenadas(lat?: number, lon?: number) {
    const tieneLat = lat !== undefined && lat !== null;
    const tieneLon = lon !== undefined && lon !== null;
    if (tieneLat !== tieneLon) {
      throw new BadRequestException('Debe ingresar latitud y longitud juntas, o dejar ambas vacías.');
    }
  }

  // Compara sin importar mayusculas para que "Urrao" y "URRAO" se
  // consideren el mismo municipio.
  private async validarNombreUnico(nombre: string) {
    const existe = await this.municipiosRepo
      .createQueryBuilder('m')
      .where('LOWER(m.nombre) = LOWER(:nombre)', { nombre })
      .getExists();
    if (existe) {
      throw new ConflictException(`El municipio "${nombre}" ya está registrado.`);
    }
  }
}
