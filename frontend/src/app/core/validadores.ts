import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validadores personalizados para formularios reactivos.
// Un validador es una funcion que recibe el control y retorna null si el
// valor es valido o un objeto con el nombre del error si no lo es.

// Rechaza textos que solo tienen espacios. Validators.required acepta "   "
// como valor valido, y eso es un error comun al llenar formularios.
export function noSoloEspacios(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (typeof valor === 'string' && valor.length > 0 && valor.trim().length === 0) {
      return { soloEspacios: true };
    }
    return null;
  };
}

// La fecha no puede ser futura (no se puede registrar una consulta que
// todavia no ha ocurrido).
export function fechaNoFutura(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as Date | null;
    if (!valor) return null;
    const finDeHoy = new Date();
    finDeHoy.setHours(23, 59, 59, 999);
    return valor.getTime() > finDeHoy.getTime() ? { fechaFutura: true } : null;
  };
}

// Para campos con autocompletado: exige que el valor sea un objeto de la
// lista (por ejemplo un Municipio) y no un texto escrito a mano.
// Sin esto el usuario podria escribir "Medelin" y enviar el formulario.
export function seleccionDeLista(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (valor === null || valor === '' || valor === undefined) return null;
    return typeof valor === 'object' && 'id' in valor ? null : { noSeleccionado: true };
  };
}

// Normaliza un texto para compararlo: sin tildes, sin espacios extra y en
// minusculas. Asi "Urrao", "URRAO" y " urrao " se consideran el mismo valor.
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Avisa en tiempo real si el valor ya existe en una lista conocida (codigos de
// kit, nombres de municipio, correos). Evita que el usuario llene todo el
// formulario y solo al guardar descubra que el valor estaba repetido.
// El backend vuelve a validar, porque la lista del navegador puede estar
// desactualizada si otra persona registro algo al mismo tiempo.
export function valorNoRepetido(existentes: string[]): ValidatorFn {
  const conjunto = new Set(existentes.map(normalizarTexto));
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (typeof valor !== 'string' || !valor.trim()) return null;
    return conjunto.has(normalizarTexto(valor)) ? { repetido: true } : null;
  };
}

// Validador de grupo: confirma que dos campos tengan el mismo valor
// (contrasena y confirmacion).
export function camposIguales(campo: string, confirmacion: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const valor1 = grupo.get(campo)?.value;
    const control2 = grupo.get(confirmacion);
    if (!control2) return null;
    const noCoinciden = !!valor1 && !!control2.value && valor1 !== control2.value;

    // Se marca el error tambien en el control de confirmacion para que
    // mat-error se muestre justo debajo de ese campo.
    if (noCoinciden) {
      control2.setErrors({ ...(control2.errors ?? {}), noCoinciden: true });
    } else if (control2.hasError('noCoinciden')) {
      const { noCoinciden: _, ...resto } = control2.errors ?? {};
      control2.setErrors(Object.keys(resto).length ? resto : null);
    }
    return noCoinciden ? { noCoinciden: true } : null;
  };
}
