import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { UsuarioToken } from '../auth/interfaces/usuario-token.interface';
import { ROLES } from '../common/constantes';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { UsuariosService } from './usuarios.service';

// Rutas de gestion de usuarios: /api/usuarios
// Los guards y el @Roles van a nivel de clase, asi TODAS las rutas quedan
// restringidas al administrador sin tener que repetirlo en cada metodo.
// La creacion de usuarios esta en POST /api/auth/register.
// No hay DELETE: los usuarios se desactivan para conservar el historial.
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  listar() {
    return this.usuariosService.listar();
  }

  // Esta ruta se declara ANTES de ':id'. Si fuera despues, Nest intentaria
  // interpretar la palabra "roles" como un id.
  @Get('roles')
  listarRoles() {
    return this.usuariosService.listarRoles();
  }

  // ParseIntPipe responde 400 si el id no es un numero, en vez de llegar
  // al servicio con un valor invalido.
  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtener(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.usuariosService.actualizar(id, dto, usuario.id);
  }
}
