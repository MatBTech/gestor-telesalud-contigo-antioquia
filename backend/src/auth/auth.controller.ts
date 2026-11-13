import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Patch, Post, UseGuards } from '@nestjs/common';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UsuarioActual } from './decorators/usuario-actual.decorator';
import { UsuarioToken } from './interfaces/usuario-token.interface';
import { ROLES } from '../common/constantes';

// Rutas de autenticacion: /api/auth/...
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usuariosService: UsuariosService,
  ) {}

  // POST /api/auth/register
  // Esta protegido para que solo un administrador cree cuentas. Si fuera
  // publico, cualquier persona podria registrarse como administrador y ver
  // datos de pacientes. El primer administrador lo crea el SeedService.
  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMINISTRADOR)
  registrar(@Body() dto: RegisterDto) {
    return this.authService.registrar(dto);
  }

  // POST /api/auth/login (publico). Se responde 200 en lugar del 201 que
  // Nest usa por defecto en POST, porque no se esta creando ningun recurso.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    // La IP identifica a quien hace la peticion, para limitar sus intentos.
    return this.authService.login(dto, ip);
  }

  // GET /api/auth/perfil: devuelve el usuario dueno del token. El frontend
  // lo puede usar para comprobar que la sesion sigue siendo valida.
  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  perfil(@UsuarioActual() usuario: UsuarioToken) {
    return usuario;
  }

  // PATCH /api/auth/perfil: cualquier usuario autenticado edita su nombre.
  // El id se toma del token, nunca del body, asi nadie puede editar a otro.
  @Patch('perfil')
  @UseGuards(JwtAuthGuard)
  actualizarPerfil(@UsuarioActual() usuario: UsuarioToken, @Body() dto: ActualizarPerfilDto) {
    return this.usuariosService.actualizarPerfil(usuario.id, dto.nombreCompleto);
  }

  // PATCH /api/auth/cambiar-password: cambio de la propia contrasena.
  @Patch('cambiar-password')
  @UseGuards(JwtAuthGuard)
  cambiarPassword(@UsuarioActual() usuario: UsuarioToken, @Body() dto: CambiarPasswordDto) {
    return this.usuariosService.cambiarPassword(usuario.id, dto.passwordActual, dto.passwordNueva);
  }
}
