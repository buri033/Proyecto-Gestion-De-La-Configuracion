export type Moneda = 'COP' | 'USD';

export type TipoCuenta =
  | 'CHECKING'
  | 'SAVINGS_GOAL'
  | 'CREDIT_CARD'
  | 'LOAN'
  | 'SYSTEM';

export type EstadoCuenta = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export type EstadoTransaccion = 'PENDING' | 'POSTED' | 'FAILED' | 'REVERSED';

export interface Asiento {
  readonly centavos: number;
  readonly estado: EstadoTransaccion;
  readonly fecha: string;
}

export interface Cuenta {
  readonly id: string;
  readonly numero: string;
  readonly tipo: TipoCuenta;
  readonly estado: EstadoCuenta;
  readonly cupo?: number;
}

export interface FilaAmortizacion {
  readonly numero: number;
  readonly cuota: import('./Dinero').Dinero;
  readonly interes: import('./Dinero').Dinero;
  readonly abonoCapital: import('./Dinero').Dinero;
  readonly saldoRestante: import('./Dinero').Dinero;
}

export interface ParametrosCredito {
  readonly ingresoMinimo: import('./Dinero').Dinero;
  readonly montoMinimo: import('./Dinero').Dinero;
  readonly montoMaximo: import('./Dinero').Dinero;
  readonly maxCuotaIngreso: number;
}

export interface Solicitud {
  readonly edad: number;
  readonly antiguedadDias: number;
  readonly ingresoMensual: import('./Dinero').Dinero;
  readonly obligacionesEnMora: number;
  readonly montoSolicitado: import('./Dinero').Dinero;
  readonly cuotaEstimada: import('./Dinero').Dinero;
  readonly porcentajePagosPuntuales: number;
  readonly saldoPromedio: import('./Dinero').Dinero;
  readonly deudaTotal: import('./Dinero').Dinero;
  readonly parametros: ParametrosCredito;
}

export interface Regla {
  readonly id: string;
  readonly descripcion: string;
  readonly cumple: (s: Solicitud) => boolean;
  readonly mensaje: string;
}

export interface Motivo {
  readonly id: string;
  readonly mensaje: string;
}

export interface AporteFactor {
  readonly factor: string;
  readonly peso: number;
  readonly puntaje: number;
  readonly aporte: number;
}

export type Decision =
  | {
      readonly aprobado: false;
      readonly score: number | null;
      readonly banda: string | null;
      readonly desglose?: readonly AporteFactor[];
      readonly motivos: readonly Motivo[];
    }
  | {
      readonly aprobado: true;
      readonly score: number;
      readonly banda: string;
      readonly desglose: readonly AporteFactor[];
      readonly montoAprobado: import('./Dinero').Dinero;
      readonly tasaAnual: number;
      readonly reducido: boolean;
      readonly motivos: readonly Motivo[];
    };
