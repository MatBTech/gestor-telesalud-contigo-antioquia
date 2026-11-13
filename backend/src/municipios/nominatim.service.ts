import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { estaDentroDeAntioquia, SUBREGIONES } from '../common/constantes';

// Forma de cada resultado que devuelve Nominatim (solo los campos que usamos).
interface ResultadoNominatim {
  lat: string;
  lon: string;
  display_name: string;
  addresstype: string;
  address?: { state_district?: string };
}

// Tipos de lugar que corresponden a un municipio. Sin este filtro, una busqueda
// como "Madrid" devolvia el barrio Madrid de Caceres (Bajo Cauca).
const TIPOS_MUNICIPIO = ['city', 'town', 'village', 'municipality'];

// Lo que este servicio entrega al resto del sistema.
export interface Coordenadas {
  latitud: number;
  longitud: number;
  nombreEncontrado: string;
  // Subregion segun OpenStreetMap (state_district), o null si no la reporta.
  subregion: string | null;
}

// Servicio que consume la API publica de OpenStreetMap Nominatim para
// convertir el nombre de un municipio en latitud y longitud (geocodificacion).
@Injectable()
export class NominatimService {
  private readonly logger = new Logger(NominatimService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  // Retorna las coordenadas o null si no se pudieron obtener.
  // Se decidio NO lanzar excepciones aqui: una falla de una API externa
  // (sin internet, servicio caido, municipio no encontrado) no debe tumbar
  // nuestra aplicacion. Quien llama decide que hacer con el null.
  async buscarCoordenadas(nombreMunicipio: string): Promise<Coordenadas | null> {
    try {
      // HttpService devuelve un Observable; firstValueFrom lo convierte en
      // una promesa para poder usar await.
      const respuesta = await firstValueFrom(
        this.http.get<ResultadoNominatim[]>(
          this.config.get<string>('NOMINATIM_URL', 'https://nominatim.openstreetmap.org/search'),
          {
            params: {
              // Se agrega el departamento y el pais para no confundir el
              // municipio con otro del mismo nombre (hay varios "Betania").
              q: `${nombreMunicipio}, Antioquia, Colombia`,
              format: 'jsonv2',
              // Se piden varios para descartar barrios o veredas con el mismo nombre.
              limit: 5,
              addressdetails: 1,
              countrycodes: 'co',
              'accept-language': 'es',
            },
            // La politica de uso de Nominatim exige identificar la aplicacion.
            headers: {
              'User-Agent': this.config.get<string>(
                'NOMINATIM_USER_AGENT',
                'GestorTelesaludContigoAntioquia/1.0',
              ),
            },
          },
        ),
      );

      if (!Array.isArray(respuesta.data) || respuesta.data.length === 0) {
        this.logger.warn(`Nominatim no encontro resultados para "${nombreMunicipio}".`);
        return null;
      }

      const primero = respuesta.data.find((r) => TIPOS_MUNICIPIO.includes(r.addresstype));
      if (!primero) {
        this.logger.warn(`Nominatim no encontro un municipio llamado "${nombreMunicipio}".`);
        return null;
      }
      const latitud = parseFloat(primero.lat);
      const longitud = parseFloat(primero.lon);

      // Si el resultado cae fuera de Antioquia, se descarta.
      if (Number.isNaN(latitud) || Number.isNaN(longitud) || !estaDentroDeAntioquia(latitud, longitud)) {
        this.logger.warn(`Nominatim devolvio coordenadas fuera de Antioquia para "${nombreMunicipio}".`);
        return null;
      }

      return {
        latitud: Number(latitud.toFixed(6)),
        longitud: Number(longitud.toFixed(6)),
        nombreEncontrado: primero.display_name,
        subregion: SUBREGIONES.find((s) => s === primero.address?.state_district) ?? null,
      };
    } catch (error) {
      // Se registra el error en la consola del servidor para poder revisarlo.
      this.logger.error(`Error consultando Nominatim: ${(error as Error).message}`);
      return null;
    }
  }
}
