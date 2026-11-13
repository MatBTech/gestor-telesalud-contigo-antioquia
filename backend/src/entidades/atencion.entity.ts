import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Municipio } from './municipio.entity';
import { Usuario } from './usuario.entity';
import { Archivo } from './archivo.entity';

// Entidad Atencion: cada teleconsulta realizada a un paciente.
@Entity('atenciones')
export class Atencion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nombrePaciente: string;

  @Column({ length: 60 })
  especialidad: string;

  @Column('text')
  motivoConsulta: string;

  // Indicador clave del programa: si el caso se resolvio sin trasladar
  // al paciente fuera de su municipio.
  @Column({ default: false })
  resueltoEnTerritorio: boolean;

  // Fecha en que ocurrio la teleconsulta (puede ser distinta a la fecha
  // en que se digito). El dashboard la usa para el filtro de 30 dias.
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaAtencion: Date;

  // Se declara la columna de la llave foranea ademas de la relacion,
  // asi se puede filtrar por municipioId sin tener que hacer un join.
  @Column({ name: 'municipio_id' })
  municipioId: number;

  // onDelete RESTRICT: la base de datos no deja borrar un municipio
  // que tenga atenciones, para no dejar registros huerfanos.
  @ManyToOne(() => Municipio, (municipio) => municipio.atenciones, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'municipio_id' })
  municipio: Municipio;

  // Usuario que registro la atencion.
  @Column({ name: 'registrado_por_id', type: 'int', nullable: true })
  registradoPorId: number | null;

  @ManyToOne(() => Usuario, (usuario) => usuario.atenciones, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'registrado_por_id' })
  registradoPor: Usuario | null;

  // Una atencion puede tener varias actas o fotos de soporte.
  @OneToMany(() => Archivo, (archivo) => archivo.atencion)
  archivos: Archivo[];

  @CreateDateColumn()
  creadoEn: Date;
}
