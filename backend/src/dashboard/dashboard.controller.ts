import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../common/constantes';
import { DashboardService } from './dashboard.service';

// Rutas de estadisticas: /api/dashboard
// Las consultan el administrador y el coordinador, que toman decisiones
// sobre el programa.
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMINISTRADOR, ROLES.COORDINADOR)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /api/dashboard -> todas las estadisticas en una sola respuesta.
  @Get()
  completo() {
    return this.dashboardService.completo();
  }

  @Get('resumen')
  resumen() {
    return this.dashboardService.resumen();
  }

  @Get('atenciones-por-subregion')
  porSubregion() {
    return this.dashboardService.atencionesPorSubregion();
  }

  @Get('atenciones-por-especialidad')
  porEspecialidad() {
    return this.dashboardService.atencionesPorEspecialidad();
  }

  @Get('kits-por-estado')
  kitsPorEstado() {
    return this.dashboardService.kitsPorEstado();
  }

  @Get('municipios-sin-atencion')
  municipiosSinAtencion() {
    return this.dashboardService.municipiosSinAtencionReciente(30);
  }
}
