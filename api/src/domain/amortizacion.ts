import { Dinero } from './Dinero';
import type { FilaAmortizacion } from './tipos';

export const anualAMensual = (tasaAnual: number): number =>
  Math.pow(1 + tasaAnual, 1 / 12) - 1;

export function calcularCuota(
  capital: Dinero,
  tasaMensual: number,
  plazoMeses: number
): Dinero {
  if (plazoMeses <= 0) throw new RangeError('El plazo debe ser mayor a cero');
  if (tasaMensual === 0) return capital.multiplicar(1 / plazoMeses);
  const factor = tasaMensual / (1 - Math.pow(1 + tasaMensual, -plazoMeses));
  return capital.multiplicar(factor);
}

export function generarAmortizacion(
  capital: Dinero,
  tasaMensual: number,
  plazoMeses: number
): FilaAmortizacion[] {
  const cuota = calcularCuota(capital, tasaMensual, plazoMeses);

  const resultado = Array.from({ length: plazoMeses }).reduce<{
    saldo: Dinero;
    filas: FilaAmortizacion[];
  }>(
    ({ saldo, filas }, _, i) => {
      const numero = i + 1;
      const esUltima = numero === plazoMeses;
      const interes = saldo.multiplicar(tasaMensual);

      const abonoCapital = esUltima ? saldo : cuota.restar(interes);
      const cuotaReal = esUltima ? saldo.sumar(interes) : cuota;
      const nuevoSaldo = saldo.restar(abonoCapital);

      return {
        saldo: nuevoSaldo,
        filas: [
          ...filas,
          { numero, cuota: cuotaReal, interes, abonoCapital, saldoRestante: nuevoSaldo },
        ],
      };
    },
    { saldo: capital, filas: [] }
  );

  return resultado.filas;
}

export function generarAmortizacionRecursiva(
  capital: Dinero,
  tasaMensual: number,
  plazoMeses: number
): FilaAmortizacion[] {
  const cuota = calcularCuota(capital, tasaMensual, plazoMeses);

  const paso = (
    saldo: Dinero,
    numero: number,
    acc: FilaAmortizacion[]
  ): FilaAmortizacion[] => {
    if (numero > plazoMeses) return acc;

    const esUltima = numero === plazoMeses;
    const interes = saldo.multiplicar(tasaMensual);
    const abonoCapital = esUltima ? saldo : cuota.restar(interes);
    const cuotaReal = esUltima ? saldo.sumar(interes) : cuota;
    const nuevoSaldo = saldo.restar(abonoCapital);

    return paso(nuevoSaldo, numero + 1, [
      ...acc,
      { numero, cuota: cuotaReal, interes, abonoCapital, saldoRestante: nuevoSaldo },
    ]);
  };

  return paso(capital, 1, []);
}

export interface ResumenCredito {
  readonly cuotaMensual: Dinero;
  readonly totalPagado: Dinero;
  readonly totalInteres: Dinero;
  readonly tabla: readonly FilaAmortizacion[];
}

export function resumenCredito(
  capital: Dinero,
  tasaMensual: number,
  plazoMeses: number
): ResumenCredito {
  const tabla = generarAmortizacion(capital, tasaMensual, plazoMeses);
  const primera = tabla[0];
  if (!primera) throw new RangeError('La tabla de amortizacion quedo vacia');

  const totalPagado = tabla.reduce<Dinero>((acc, f) => acc.sumar(f.cuota), Dinero.cero());
  const totalInteres = tabla.reduce<Dinero>((acc, f) => acc.sumar(f.interes), Dinero.cero());

  return { cuotaMensual: primera.cuota, totalPagado, totalInteres, tabla };
}
