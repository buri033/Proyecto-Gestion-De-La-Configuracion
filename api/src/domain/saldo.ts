import { Dinero } from './Dinero';
import type { Asiento } from './tipos';

export const calcularSaldo = (asientos: readonly Asiento[]): Dinero =>
  asientos.reduce<Dinero>((acc, a) => acc.sumar(new Dinero(a.centavos)), Dinero.cero());

export function calcularSaldoImperativo(asientos: readonly Asiento[]): Dinero {
  let total = 0;
  for (let i = 0; i < asientos.length; i++) {
    const a = asientos[i];
    if (a) total = total + a.centavos;
  }
  return new Dinero(total);
}

export const esConfirmado = (a: Asiento): boolean => a.estado === 'POSTED';
export const esEntrada    = (a: Asiento): boolean => a.centavos > 0;
export const esSalida     = (a: Asiento): boolean => a.centavos < 0;

export const saldoDisponible = (asientos: readonly Asiento[]): Dinero =>
  calcularSaldo(asientos.filter(esConfirmado));

export const cupoDisponible = (cupo: Dinero, asientos: readonly Asiento[]): Dinero =>
  cupo.sumar(calcularSaldo(asientos.filter(esConfirmado)));

export const agruparPorFecha = (
  asientos: readonly Asiento[]
): Record<string, Asiento[]> =>
  asientos
    .slice()
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
    .reduce<Record<string, Asiento[]>>((grupos, a) => {
      const dia = a.fecha.slice(0, 10);
      return { ...grupos, [dia]: [...(grupos[dia] ?? []), a] };
    }, {});

export const transaccionCuadra = (asientos: readonly Asiento[]): boolean =>
  calcularSaldo(asientos).esCero();
