import { Component, inject, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { UsuariosService } from '../../../core/services/api.services';
import { AuthService } from '../../../core/services/auth.service';
import { extraerMensajeError, NotificacionService } from '../../../core/services/notificacion.service';
import { Usuario } from '../../../core/models/modelos';
import { etiquetaRol } from '../../../core/constantes';
import { ConfirmarDialogoComponent } from '../../../shared/confirmar-dialogo.component';
import { DialogoUsuarioComponent } from '../dialogo-usuario/dialogo-usuario.component';

// Gestion de usuarios (solo administrador).
@Component({
  selector: 'app-lista-usuarios',
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule, MatSlideToggleModule, MatProgressBarModule],
  templateUrl: './lista-usuarios.component.html',
})
export class ListaUsuariosComponent implements OnInit {
  private readonly usuariosService = inject(UsuariosService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  readonly idActual = inject(AuthService).usuario()?.id;

  readonly columnas = ['nombre', 'correo', 'rol', 'activo', 'acciones'];
  readonly etiquetaRol = etiquetaRol;
  readonly usuarios = signal<Usuario[]>([]);
  readonly cargando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.usuariosService.listar().subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.notificacion.error(extraerMensajeError(err, 'No se pudieron cargar los usuarios.'));
      },
    });
  }

  abrirDialogo(usuario: Usuario | null = null): void {
    this.dialog
      .open(DialogoUsuarioComponent, {
        data: { usuario, correosExistentes: this.usuarios().map((u) => u.correo) },
        width: '480px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((guardado?: Usuario) => {
        if (!guardado) return;
        this.notificacion.exito(usuario ? 'Usuario actualizado.' : `Usuario ${guardado.correo} registrado.`);
        this.cargar();
      });
  }

  // Activar o desactivar con confirmacion. Si se cancela, el interruptor
  // vuelve a su posicion original.
  cambiarActivo(usuario: Usuario, evento: MatSlideToggleChange): void {
    const activar = evento.checked;
    this.dialog
      .open(ConfirmarDialogoComponent, {
        data: {
          titulo: activar ? 'Activar usuario' : 'Desactivar usuario',
          mensaje: activar
            ? `${usuario.nombreCompleto} podrá ingresar nuevamente al sistema.`
            : `${usuario.nombreCompleto} no podrá ingresar al sistema. Su historial de atenciones se conserva.`,
          textoConfirmar: activar ? 'Activar' : 'Desactivar',
          peligro: !activar,
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) {
          evento.source.checked = usuario.activo;
          return;
        }
        this.usuariosService.actualizar(usuario.id, { activo: activar }).subscribe({
          next: (actualizado) => {
            this.usuarios.update((lista) => lista.map((u) => (u.id === actualizado.id ? actualizado : u)));
            this.notificacion.exito(activar ? 'Usuario activado.' : 'Usuario desactivado.');
          },
          error: (err) => {
            evento.source.checked = usuario.activo;
            this.notificacion.error(extraerMensajeError(err));
          },
        });
      });
  }
}
