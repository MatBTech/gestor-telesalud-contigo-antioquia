import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Atencion, Kit, Municipio } from '../entidades';

// Servicio de estadisticas. Todas las consultas usan QueryBuilder con
// GROUP BY para que la base de datos haga los calculos. Es mucho mas
// eficiente que traer todas las filas y contarlas en JavaScript.
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Atencion) private readonly atencionesRepo: Repository<Atencion>,
    @InjectRepository(Kit) private readonly kitsRepo: Repository<Kit>,
    @InjectRepository(Municipio) private readonly municipiosRepo: Repository<Municipio>,
  ) {}

  // Totales generales para las tarjetas superiores del dashboard.
  async resumen() {
    const totalAtenciones = await this.atencionesRepo.count();
    const resueltas = await this.atencionesRepo.count({ where: { resueltoEnTerritorio: true } });
    const totalMunicipios = await this.municipiosRepo.count();
    const totalKits = await this.kitsRepo.count();
    const kitsAsignados = await this.kitsRepo.count({ where: { estado: 'asignado' } });

    return {
      totalAtenciones,
      resueltasEnTerritorio: resueltas,
      // Se evita la division por cero cuando todavia no hay atenciones.
      porcentajeResolucion: totalAtenciones === 0 ? 0 : Math.round((resueltas / totalAtenciones) * 1000) / 10,
      totalMunicipios,
      totalKits,
      kitsAsignados,
    };
  }

  // Atenciones agrupadas por subregion. Se hace join con municipio porque
  // la subregion es un dato del municipio, no de la atencion.
  async atencionesPorSubregion() {
    const filas = await this.atencionesRepo
      .createQueryBuilder('a')
      .innerJoin('a.municipio', 'm')
      .select('m.subregion', 'subregion')
      .addSelect('COUNT(a.id)', 'total')
      .groupBy('m.subregion')
      .orderBy('COUNT(a.id)', 'DESC')
      .getRawMany<{ subregion: string; total: string }>();

    // COUNT llega como texto desde PostgreSQL; se convierte a numero.
    return filas.map((f) => ({ subregion: f.subregion, total: Number(f.total) }));
  }

  // Atenciones por especialidad, incluyendo cuantas se resolvieron en el
  // territorio (SUM con CASE cuenta solo las filas que cumplen la condicion).
  async atencionesPorEspecialidad() {
    const filas = await this.atencionesRepo
      .createQueryBuilder('a')
      .select('a.especialidad', 'especialidad')
      .addSelect('COUNT(a.id)', 'total')
      .addSelect('SUM(CASE WHEN a.resueltoEnTerritorio = true THEN 1 ELSE 0 END)', 'resueltas')
      .groupBy('a.especialidad')
      .orderBy('COUNT(a.id)', 'DESC')
      .getRawMany<{ especialidad: string; total: string; resueltas: string }>();

    return filas.map((f) => ({
      especialidad: f.especialidad,
      total: Number(f.total),
      resueltas: Number(f.resueltas),
    }));
  }

  // Conteo de kits por estado.
  async kitsPorEstado() {
    const filas = await this.kitsRepo
      .createQueryBuilder('k')
      .select('k.estado', 'estado')
      .addSelect('COUNT(k.id)', 'total')
      .groupBy('k.estado')
      .getRawMany<{ estado: string; total: string }>();

    return filas.map((f) => ({ estado: f.estado, total: Number(f.total) }));
  }

  // Municipios que tienen kit asignado pero NO han registrado atenciones en
  // los ultimos N dias. Es una alerta para el coordinador: puede que el kit
  // este danado o que no se este usando.
  // Se usa una subconsulta NOT EXISTS: por cada municipio se pregunta si
  // existe alguna atencion reciente; si no existe, el municipio aparece.
  async municipiosSinAtencionReciente(dias = 30) {
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);

    const filas = await this.municipiosRepo
      .createQueryBuilder('m')
      .innerJoin('m.kits', 'k', 'k.estado = :estado', { estado: 'asignado' })
      .select('m.id', 'id')
      .addSelect('m.nombre', 'nombre')
      .addSelect('m.subregion', 'subregion')
      .addSelect('COUNT(k.id)', 'kitsAsignados')
      .where((qb) => {
        const subconsulta = qb
          .subQuery()
          .select('1')
          .from(Atencion, 'a')
          .where('a.municipioId = m.id')
          .andWhere('a.fechaAtencion >= :desde')
          .getQuery();
        return `NOT EXISTS ${subconsulta}`;
      })
      .setParameter('desde', desde)
      .groupBy('m.id')
      .addGroupBy('m.nombre')
      .addGroupBy('m.subregion')
      .orderBy('m.nombre', 'ASC')
      .getRawMany<{ id: number; nombre: string; subregion: string; kitsAsignados: string }>();

    return filas.map((f) => ({
      id: Number(f.id),
      nombre: f.nombre,
      subregion: f.subregion,
      kitsAsignados: Number(f.kitsAsignados),
    }));
  }

  // Reune todo en una sola respuesta para que el frontend haga una sola
  // peticion al cargar el dashboard. Promise.all ejecuta las consultas en
  // paralelo en vez de una despues de otra.
  async completo() {
    const [resumen, porSubregion, porEspecialidad, kitsPorEstado, municipiosSinAtencion] =
      await Promise.all([
        this.resumen(),
        this.atencionesPorSubregion(),
        this.atencionesPorEspecialidad(),
        this.kitsPorEstado(),
        this.municipiosSinAtencionReciente(30),
      ]);
    return { resumen, porSubregion, porEspecialidad, kitsPorEstado, municipiosSinAtencion };
  }
}
