import type { Regla, Solicitud } from './tipos';

export const REQUISITOS_PRESTAMO: readonly Regla[] = [
  {
    id: 'RD-01',
    descripcion: 'Edad entre 18 y 70 anios',
    cumple: (s) => s.edad >= 18 && s.edad <= 70,
    mensaje: 'Debes tener entre 18 y 70 anios para solicitar un credito.',
  },
  {
    id: 'RD-02',
    descripcion: 'Antiguedad de la cuenta minimo 30 dias',
    cumple: (s) => s.antiguedadDias >= 30,
    mensaje: 'Tu cuenta necesita al menos 30 dias de antiguedad.',
  },
  {
    id: 'RD-03',
    descripcion: 'Ingresos mensuales minimos',
    cumple: (s) => s.ingresoMensual.centavos >= s.parametros.ingresoMinimo.centavos,
    mensaje: 'Tus ingresos declarados no alcanzan el minimo requerido.',
  },
  {
    id: 'RD-04',
    descripcion: 'Sin obligaciones en mora',
    cumple: (s) => s.obligacionesEnMora === 0,
    mensaje: 'Tienes obligaciones en mora. Ponte al dia para solicitar un credito.',
  },
  {
    id: 'RD-05',
    descripcion: 'Monto dentro del rango del producto',
    cumple: (s) =>
      s.montoSolicitado.centavos >= s.parametros.montoMinimo.centavos &&
      s.montoSolicitado.centavos <= s.parametros.montoMaximo.centavos,
    mensaje: 'El monto solicitado esta fuera del rango de este producto.',
  },
  {
    id: 'RD-06',
    descripcion: 'Relacion cuota/ingreso menor o igual al 30%',
    cumple: (s) =>
      s.cuotaEstimada.centavos / s.ingresoMensual.centavos <= s.parametros.maxCuotaIngreso,
    mensaje: 'La cuota supera el 30% de tus ingresos. Prueba con un plazo mayor o un monto menor.',
  },
];

export const evaluarReglas = (
  reglas: readonly Regla[],
  solicitud: Solicitud
): readonly Regla[] => reglas.filter((regla) => !regla.cumple(solicitud));

export const cumpleTodas = (reglas: readonly Regla[], solicitud: Solicitud): boolean =>
  evaluarReglas(reglas, solicitud).length === 0;

export function evaluarImperativo(s: Solicitud): string[] {
  const errores: string[] = [];
  if (s.edad < 18 || s.edad > 70) {
    errores.push('Debes tener entre 18 y 70 anios para solicitar un credito.');
  }
  if (s.antiguedadDias < 30) {
    errores.push('Tu cuenta necesita al menos 30 dias de antiguedad.');
  }
  if (s.ingresoMensual.centavos < s.parametros.ingresoMinimo.centavos) {
    errores.push('Tus ingresos declarados no alcanzan el minimo requerido.');
  }
  if (s.obligacionesEnMora !== 0) {
    errores.push('Tienes obligaciones en mora. Ponte al dia para solicitar un credito.');
  }
  if (
    s.montoSolicitado.centavos < s.parametros.montoMinimo.centavos ||
    s.montoSolicitado.centavos > s.parametros.montoMaximo.centavos
  ) {
    errores.push('El monto solicitado esta fuera del rango de este producto.');
  }
  if (s.cuotaEstimada.centavos / s.ingresoMensual.centavos > s.parametros.maxCuotaIngreso) {
    errores.push('La cuota supera el 30% de tus ingresos. Prueba con un plazo mayor o un monto menor.');
  }
  return errores;
}
