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
import { ROLES } from '../common/constantes';
import { CrearMunicipioDto } from './dto/crear-municipio.dto';
import { ActualizarMunicipioDto } from './dto/actualizar-municipio.dto';
import { MunicipiosService } from './municipios.service';

// Rutas de municipios: /api/municipios
// Consultar: cualquier usuario autenticado (el medico necesita la lista
// para registrar atenciones). Crear y editar: administrador y coordinador.
// Eliminar: solo administrador.
@Controller('municipios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MunicipiosController {
  constructor(private readonly municipiosService: MunicipiosService) {}

  @Get()
  listar() {
    return this.municipiosService.listar();
  }

  // GET /api/municipios/geocodificar?nombre=Urrao
  // Se declara antes de ':id' para que "geocodificar" no se tome como id.
  @Get('geocodificar')
  @Roles(ROLES.ADMINISTRADOR, ROLES.COORDINADOR)
  geocodificar(@Query('nombre') nombre: string) {
    return this.municipiosService.geocodificar(nombre);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.municipiosService.obtener(id);
  }

  @Post()
  @Roles(ROLES.ADMINISTRADOR, ROLES.COORDINADOR)
  crear(@Body() dto: CrearMunicipioDto) {
    return this.municipiosService.crear(dto);
  }

  @Patch(':id')
  @Roles(ROLES.ADMINISTRADOR, ROLES.COORDINADOR)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarMunicipioDto) {
    return this.municipiosService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.municipiosService.eliminar(id);
  }
}
