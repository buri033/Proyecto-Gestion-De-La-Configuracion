import { evaluarReglas, REQUISITOS_PRESTAMO } from './reglas';
import type { AporteFactor, Decision, Solicitud } from './tipos';

interface Rango { readonly hasta: number; readonly puntos: number }

const escalonar = (rangos: readonly Rango[]) => (valor: number): number =>
  rangos.find((r) => valor <= r.hasta)?.puntos ?? 100;

export interface Factor {
  readonly id: string;
  readonly peso: number;
  readonly medir: (s: Solicitud) => number;
}

export const FACTORES: readonly Factor[] = [
  {
    id: 'ingresos',
    peso: 0.30,
    medir: (s) =>
      escalonar([
        { hasta: 1_500_000, puntos: 20 },
        { hasta: 2_500_000, puntos: 45 },
        { hasta: 4_000_000, puntos: 70 },
        { hasta: 7_000_000, puntos: 90 },
      ])(s.ingresoMensual.pesos),
  },
  {
    id: 'antiguedad',
    peso: 0.20,
    medir: (s) =>
      escalonar([
        { hasta: 30, puntos: 25 },
        { hasta: 90, puntos: 50 },
        { hasta: 180, puntos: 75 },
        { hasta: 365, puntos: 90 },
      ])(s.antiguedadDias),
  },
  { id: 'historialPagos', peso: 0.25, medir: (s) => s.porcentajePagosPuntuales },
  {
    id: 'saldoPromedio',
    peso: 0.15,
    medir: (s) =>
      escalonar([
        { hasta: 200_000, puntos: 20 },
        { hasta: 800_000, puntos: 50 },
        { hasta: 2_000_000, puntos: 80 },
      ])(s.saldoPromedio.pesos),
  },
  {
    id: 'endeudamiento',
    peso: 0.10,
    medir: (s) => {
      const ratio = s.deudaTotal.pesos / Math.max(s.ingresoMensual.pesos * 12, 1);
      return Math.max(0, 100 - ratio * 200);
    },
  },
];

export const calcularScore = (
  solicitud: Solicitud,
  factores: readonly Factor[] = FACTORES
): number =>
  Math.round(factores.reduce((acc, f) => acc + f.medir(solicitud) * f.peso, 0) * 10);

export const desgloseScore = (
  solicitud: Solicitud,
  factores: readonly Factor[] = FACTORES
): AporteFactor[] =>
  factores.map((f) => ({
    factor: f.id,
    peso: f.peso,
    puntaje: Math.round(f.medir(solicitud)),
    aporte: Math.round(f.medir(solicitud) * f.peso * 10),
  }));

export interface Banda {
  readonly banda: string;
  readonly hasta: number;
  readonly aprueba: boolean;
  readonly factorMonto: number;
  readonly puntosExtraTasa: number;
}

export const BANDAS: readonly Banda[] = [
  { banda: 'D', hasta: 499,  aprueba: false, factorMonto: 0,   puntosExtraTasa: 0 },
  { banda: 'C', hasta: 649,  aprueba: true,  factorMonto: 0.6, puntosExtraTasa: 0.09 },
  { banda: 'B', hasta: 799,  aprueba: true,  factorMonto: 1.0, puntosExtraTasa: 0.04 },
  { banda: 'A', hasta: 1000, aprueba: true,  factorMonto: 1.0, puntosExtraTasa: 0 },
];

export const bandaDe = (score: number): Banda | undefined =>
  BANDAS.find((b) => score <= b.hasta);

export function evaluarSolicitud(solicitud: Solicitud, tasaBaseAnual: number): Decision {
  const incumplidas = evaluarReglas(REQUISITOS_PRESTAMO, solicitud);

  if (incumplidas.length > 0) {
    return {
      aprobado: false,
      score: null,
      banda: null,
      motivos: incumplidas.map((r) => ({ id: r.id, mensaje: r.mensaje })),
    };
  }

  const score = calcularScore(solicitud);
  const banda = bandaDe(score);

  if (!banda || !banda.aprueba) {
    return {
      aprobado: false,
      score,
      banda: banda?.banda ?? null,
      desglose: desgloseScore(solicitud),
      motivos: [
        { id: 'SCORE', mensaje: 'Tu perfil crediticio no alcanza el puntaje minimo en este momento.' },
      ],
    };
  }

  return {
    aprobado: true,
    score,
    banda: banda.banda,
    desglose: desgloseScore(solicitud),
    montoAprobado: solicitud.montoSolicitado.multiplicar(banda.factorMonto),
    tasaAnual: tasaBaseAnual + banda.puntosExtraTasa,
    reducido: banda.factorMonto < 1,
    motivos:
      banda.factorMonto < 1
        ? [{ id: 'AJUSTE', mensaje: 'Ajustamos el monto a tu capacidad de pago actual.' }]
        : [],
  };
}
