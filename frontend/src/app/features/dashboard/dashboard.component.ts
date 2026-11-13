import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardService } from '../../core/services/api.services';
import { Dashboard } from '../../core/models/modelos';
import { ESTADOS_KIT } from '../../core/constantes';
import { extraerMensajeError } from '../../core/services/notificacion.service';

// Dashboard de estadisticas.
// Se usan tarjetas con numeros y barras hechas con CSS en lugar de una
// libreria de graficos: pesan menos y cargan rapido con internet satelital.
@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly datos = signal<Dashboard | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  // Valor maximo de cada grupo, para calcular el ancho de las barras en %.
  readonly maxSubregion = computed(() => Math.max(1, ...(this.datos()?.porSubregion.map((s) => s.total) ?? [])));
  readonly maxEspecialidad = computed(() => Math.max(1, ...(this.datos()?.porEspecialidad.map((e) => e.total) ?? [])));

  // Se recorren los cuatro estados aunque alguno tenga 0 kits, para que
  // las tarjetas siempre aparezcan en el mismo orden.
  readonly kitsPorEstado = computed(() =>
    ESTADOS_KIT.map((estado) => ({
      ...estado,
      total: this.datos()?.kitsPorEstado.find((k) => k.estado === estado.valor)?.total ?? 0,
    })),
  );

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.dashboardService.obtener().subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(extraerMensajeError(err, 'No se pudieron cargar las estadísticas.'));
        this.cargando.set(false);
      },
    });
  }

  porcentaje(valor: number, maximo: number): number {
    return Math.round((valor / maximo) * 100);
  }
}
