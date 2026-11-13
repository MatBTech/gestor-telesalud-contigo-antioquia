import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Municipio } from './municipio.entity';
import type { EstadoKit } from '../common/constantes';

// Entidad Kit: equipos satelitales (antena, router y equipos medicos)
// que se entregan a los municipios para hacer la teleconsulta.
@Entity('kits')
export class Kit {
  @PrimaryGeneratedColumn()
  id: number;

  // Codigo de inventario con formato KIT-0001. Debe ser unico.
  @Column({ length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  descripcion: string | null;

  // Se guarda como varchar en vez de un enum de PostgreSQL para que sea
  // mas facil agregar estados nuevos sin migraciones complicadas.
  // Los valores permitidos se controlan en el DTO con @IsIn.
  @Column({ type: 'varchar', length: 20, default: 'disponible' })
  estado: EstadoKit;

  // Solo tiene municipio cuando el estado es 'asignado'.
  @Column({ name: 'municipio_id', type: 'int', nullable: true })
  municipioId: number | null;

  @ManyToOne(() => Municipio, (municipio) => municipio.kits, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'municipio_id' })
  municipio: Municipio | null;

  @Column({ type: 'timestamp', nullable: true })
  fechaAsignacion: Date | null;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
