import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../entidades';
import { MAX_INTENTOS_LOGIN, MINUTOS_BLOQUEO_LOGIN } from '../common/constantes';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PayloadJwt } from './interfaces/usuario-token.interface';

// Servicio de autenticacion: registro e inicio de sesion.
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>,
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  // El registro se delega al UsuariosService, que ya valida el correo
  // repetido, busca el rol y cifra la contrasena. Asi no se duplica logica.
  registrar(dto: RegisterDto) {
    return this.usuariosService.crear(dto);
  }

  // Intentos fallidos por IP. Se guarda en memoria del servidor.
  // shortcut: se pierde al reiniciar y no se comparte entre varias instancias del
  // backend; si se despliega con mas de una, pasarlo a Redis o a la base de datos.
  private readonly intentosPorIp = new Map<string, { fallos: number; desde: number; bloqueadoHasta?: number }>();

  async login(dto: LoginDto, ip: string) {
    // Si esta IP esta bloqueada se rechaza sin consultar la base de datos ni
    // comparar la contrasena: durante el bloqueo ni la correcta sirve.
    this.revisarBloqueo(ip);

    // Como password tiene select: false, hay que pedirla explicitamente.
    const usuario = await this.usuariosRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .leftJoinAndSelect('u.rol', 'rol')
      .where('u.correo = :correo', { correo: dto.correo })
      .getOne();

    // Se usa el MISMO mensaje si el correo no existe o si la contrasena esta
    // mal. Asi no se le confirma a un atacante que un correo esta registrado.
    // Ambos casos cuentan como intento fallido de esta IP.
    const credencialesValidas = usuario && (await bcrypt.compare(dto.password, usuario.password));
    if (!usuario || !credencialesValidas) {
      this.registrarFallo(ip);
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    if (!usuario.activo) {
      throw new UnauthorizedException('Su usuario está inactivo. Comuníquese con el administrador.');
    }

    // Ingreso correcto: se reinicia el contador de esta IP.
    this.intentosPorIp.delete(ip);

    const payload: PayloadJwt = { sub: usuario.id, correo: usuario.correo, rol: usuario.rol.nombre };

    // Se retorna el token y los datos basicos del usuario, sin la contrasena.
    return {
      accessToken: await this.jwtService.signAsync(payload),
      usuario: {
        id: usuario.id,
        nombreCompleto: usuario.nombreCompleto,
        correo: usuario.correo,
        rol: usuario.rol.nombre,
      },
    };
  }

  private revisarBloqueo(ip: string): void {
    const registro = this.intentosPorIp.get(ip);
    if (!registro) return;
    const ahora = Date.now();
    if (registro.bloqueadoHasta && registro.bloqueadoHasta > ahora) {
      this.lanzarBloqueo(registro.bloqueadoHasta);
    }
    // Bloqueo vencido, o fallos viejos (de hace mas de la ventana): se olvidan.
    if (registro.bloqueadoHasta || ahora - registro.desde > MINUTOS_BLOQUEO_LOGIN * 60_000) {
      this.intentosPorIp.delete(ip);
    }
  }

  // Suma un fallo a la IP. Al llegar al maximo la bloquea y avisa de una vez.
  private registrarFallo(ip: string): void {
    const registro = this.intentosPorIp.get(ip) ?? { fallos: 0, desde: Date.now() };
    registro.fallos++;
    this.intentosPorIp.set(ip, registro);
    if (registro.fallos >= MAX_INTENTOS_LOGIN) {
      registro.bloqueadoHasta = Date.now() + MINUTOS_BLOQUEO_LOGIN * 60_000;
      this.lanzarBloqueo(registro.bloqueadoHasta);
    }
  }

  // 429 Too Many Requests: es el codigo HTTP para "demasiados intentos".
  private lanzarBloqueo(hasta: number): never {
    const minutos = Math.ceil((hasta - Date.now()) / 60_000);
    throw new HttpException(
      `Demasiados intentos fallidos de inicio de sesión. Intente de nuevo en ${minutos} minuto(s).`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
