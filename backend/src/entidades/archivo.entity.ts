import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Atencion } from './atencion.entity';
import { Usuario } from './usuario.entity';

// Entidad Archivo: guarda los DATOS del archivo, no el archivo en si.
// El archivo fisico queda en la carpeta ./uploads con un nombre aleatorio.
@Entity('archivos')
export class Archivo {
  @PrimaryGeneratedColumn()
  id: number;

  // Nombre con el que el usuario subio el archivo, para devolverlo igual
  // al momento de descargarlo.
  @Column({ length: 255 })
  nombreOriginal: string;

  // Nombre real en disco (UUID + extension). Un nombre aleatorio evita que
  // dos archivos con el mismo nombre se sobrescriban y que alguien adivine
  // las rutas.
  @Column({ length: 255, unique: true })
  nombreGuardado: string;

  @Column({ length: 100 })
  mimeType: string;

  // Tamano en bytes.
  @Column('int')
  tamano: number;

  @Column({ name: 'atencion_id' })
  atencionId: number;

  // CASCADE: si se elimina la atencion se eliminan sus registros de archivo.
  @ManyToOne(() => Atencion, (atencion) => atencion.archivos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'atencion_id' })
  atencion: Atencion;

  @Column({ name: 'subido_por_id', type: 'int', nullable: true })
  subidoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subido_por_id' })
  subidoPor: Usuario | null;

  @CreateDateColumn()
  subidoEn: Date;
}
