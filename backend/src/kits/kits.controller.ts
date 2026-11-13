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
import { KitsService } from './kits.service';
import { CrearKitDto } from './dto/crear-kit.dto';
import { ActualizarKitDto } from './dto/actualizar-kit.dto';
import { CambiarEstadoKitDto } from './dto/cambiar-estado-kit.dto';
import { FiltroKitsDto } from './dto/filtro-kits.dto';

// Rutas de kits: /api/kits
// El inventario lo gestionan el administrador y el coordinador.
@Controller('kits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.COORDINADOR)
export class KitsController {
  constructor(private readonly kitsService: KitsService) {}

  @Get()
  listar(@Query() filtro: FiltroKitsDto) {
    return this.kitsService.listar(filtro);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.kitsService.obtener(id);
  }

  @Post()
  crear(@Body() dto: CrearKitDto) {
    return this.kitsService.crear(dto);
  }

  // PATCH /api/kits/5  body: { "codigo": "KIT-0005", "descripcion": "..." }
  // Lo pueden usar el administrador y el coordinador (roles de la clase).
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarKitDto) {
    return this.kitsService.actualizar(id, dto);
  }

  // PATCH /api/kits/5/estado  body: { "estado": "asignado", "municipioId": 3 }
  @Patch(':id/estado')
  cambiarEstado(@Param('id', ParseIntPipe) id: number, @Body() dto: CambiarEstadoKitDto) {
    return this.kitsService.cambiarEstado(id, dto);
  }

  // El @Roles del metodo reemplaza al de la clase: solo el administrador borra.
  @Delete(':id')
  @Roles(ROLES.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.kitsService.eliminar(id);
  }
}
