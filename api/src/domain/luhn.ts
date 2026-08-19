const BIN_PRUEBAS = '400000';

export const sumaLuhn = (digitos: readonly number[]): number =>
  digitos
    .slice()
    .reverse()
    .reduce((suma, d, i) => {
      const v = i % 2 === 1 ? d * 2 : d;
      return suma + (v > 9 ? v - 9 : v);
    }, 0);

export const esValidoLuhn = (numero: string): boolean => {
  const digitos = numero.replace(/\D/g, '').split('').map(Number);
  return digitos.length > 0 && sumaLuhn(digitos) % 10 === 0;
};

export const digitoVerificador = (parcial: string): number => {
  const digitos = parcial.split('').map(Number);
  return (10 - (sumaLuhn([...digitos, 0]) % 10)) % 10;
};

export function generarNumeroTarjeta(bin: string = BIN_PRUEBAS): string {
  const faltantes = 15 - bin.length;
  const aleatorios = Array.from({ length: faltantes }, () =>
    Math.floor(Math.random() * 10)
  ).join('');
  const parcial = bin + aleatorios;
  return parcial + String(digitoVerificador(parcial));
}

export const enmascarar = (numero: string): string =>
  `•••• •••• •••• ${numero.slice(-4)}`;

export const ultimos4 = (numero: string): string => numero.slice(-4);

export const generarCvv = (): string =>
  String(Math.floor(Math.random() * 900) + 100);

export const generarVencimiento = (aniosVigencia = 5): { mes: number; anio: number } => {
  const hoy = new Date();
  return { mes: hoy.getMonth() + 1, anio: hoy.getFullYear() + aniosVigencia };
};
