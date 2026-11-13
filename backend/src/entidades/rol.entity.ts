import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

// Entidad Rol: representa los perfiles del sistema
// (administrador, coordinador, medico_ebs).
// Se guarda en una tabla aparte para poder agregar roles nuevos sin
// modificar la tabla de usuarios.
@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn()
  id: number;

  // El nombre es unico porque el RolesGuard compara los permisos por nombre.
  @Column({ length: 30, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  descripcion: string | null;

  // Relacion uno a muchos: un rol lo pueden tener muchos usuarios.
  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios: Usuario[];
}
