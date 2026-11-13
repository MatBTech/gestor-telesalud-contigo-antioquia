import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { transformadorDecimal } from '../common/transformadores';
import { Atencion } from './atencion.entity';
import { Kit } from './kit.entity';

// Entidad Municipio: municipios de Antioquia donde opera el programa.
@Entity('municipios')
export class Municipio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80, unique: true })
  nombre: string;

  // Se guarda como texto, pero el DTO lo valida contra la lista SUBREGIONES.
  @Column({ length: 40 })
  subregion: string;

  // DECIMAL(9,6) da una precision de unos 10 cm, mas que suficiente.
  // Son opcionales porque la consulta a Nominatim puede fallar.
  @Column('decimal', {
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: transformadorDecimal,
  })
  latitud: number | null;

  @Column('decimal', {
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: transformadorDecimal,
  })
  longitud: number | null;

  // Indica de donde salieron las coordenadas: 'nominatim' o 'manual'.
  // Sirve para saber cuales conviene revisar.
  @Column({ length: 20, default: 'manual' })
  origenCoordenadas: string;

  @OneToMany(() => Atencion, (atencion) => atencion.municipio)
  atenciones: Atencion[];

  @OneToMany(() => Kit, (kit) => kit.municipio)
  kits: Kit[];

  @CreateDateColumn()
  creadoEn: Date;
}
