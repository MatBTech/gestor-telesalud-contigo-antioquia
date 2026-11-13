import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Rol } from './rol.entity';
import { Atencion } from './atencion.entity';

// Entidad Usuario: personas que ingresan al sistema.
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  nombreCompleto: string;

  // El correo es el dato para iniciar sesion, por eso debe ser unico.
  @Column({ length: 120, unique: true })
  correo: string;

  // select: false hace que la contrasena (ya cifrada) NO venga en las
  // consultas normales. Solo el login la pide de forma explicita.
  @Column({ select: false })
  password: string;

  // En lugar de borrar usuarios se desactivan, para no perder el historial
  // de las atenciones que registraron.
  @Column({ default: true })
  activo: boolean;

  // Muchos usuarios pertenecen a un rol. eager: true carga el rol
  // automaticamente porque casi siempre se necesita (guards y login).
  @ManyToOne(() => Rol, (rol) => rol.usuarios, { eager: true, nullable: false })
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @OneToMany(() => Atencion, (atencion) => atencion.registradoPor)
  atenciones: Atencion[];

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
