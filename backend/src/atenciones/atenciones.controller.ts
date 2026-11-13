import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { UsuarioToken } from '../auth/interfaces/usuario-token.interface';
import { ROLES } from '../common/constantes';
import { AtencionesService } from './atenciones.service';
import { CrearAtencionDto } from './dto/crear-atencion.dto';
import { ActualizarAtencionDto } from './dto/actualizar-atencion.dto';
import { FiltroAtencionesDto } from './dto/filtro-atenciones.dto';

// Rutas de atenciones: /api/atenciones
// Consultar: todos los roles. Registrar y editar: medico EBS y administrador.
// Eliminar: solo administrador.
@Controller('atenciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AtencionesController {
  constructor(private readonly atencionesService: AtencionesService) {}

  // GET /api/atenciones?municipioId=1&especialidad=Pediatría&pagina=1&limite=10
  @Get()
  listar(@Query() filtro: FiltroAtencionesDto) {
    return this.atencionesService.listar(filtro);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.atencionesService.obtener(id);
  }

  @Post()
  @Roles(ROLES.MEDICO_EBS, ROLES.ADMINISTRADOR)
  crear(@Body() dto: CrearAtencionDto, @UsuarioActual() usuario: UsuarioToken) {
    return this.atencionesService.crear(dto, usuario);
  }

  @Patch(':id')
  @Roles(ROLES.MEDICO_EBS, ROLES.ADMINISTRADOR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarAtencionDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.atencionesService.actualizar(id, dto, usuario);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.atencionesService.eliminar(id);
  }
}
