import type { Moneda } from './tipos';

export class Dinero {
  readonly #centavos: number;
  readonly #moneda: Moneda;

  constructor(centavos: number, moneda: Moneda = 'COP') {
    if (!Number.isInteger(centavos)) {
      throw new TypeError('Dinero solo acepta centavos enteros. Usa Dinero.dePesos()');
    }
    this.#centavos = centavos;
    this.#moneda = moneda;
  }

  static dePesos(pesos: number, moneda: Moneda = 'COP'): Dinero {
    return new Dinero(Math.round(pesos * 100), moneda);
  }

  static cero(moneda: Moneda = 'COP'): Dinero {
    return new Dinero(0, moneda);
  }

  get centavos(): number { return this.#centavos; }
  get moneda(): Moneda   { return this.#moneda; }
  get pesos(): number    { return this.#centavos / 100; }

  #verificarMoneda(otro: Dinero): void {
    if (this.#moneda !== otro.moneda) {
      throw new Error(`No se puede operar ${this.#moneda} con ${otro.moneda}`);
    }
  }

  sumar(otro: Dinero): Dinero {
    this.#verificarMoneda(otro);
    return new Dinero(this.#centavos + otro.centavos, this.#moneda);
  }

  restar(otro: Dinero): Dinero {
    this.#verificarMoneda(otro);
    return new Dinero(this.#centavos - otro.centavos, this.#moneda);
  }

  multiplicar(factor: number): Dinero {
    return new Dinero(Math.round(this.#centavos * factor), this.#moneda);
  }

  negar(): Dinero { return new Dinero(-this.#centavos, this.#moneda); }

  esCero(): boolean     { return this.#centavos === 0; }
  esPositivo(): boolean { return this.#centavos > 0; }
  esNegativo(): boolean { return this.#centavos < 0; }

  mayorQue(otro: Dinero): boolean {
    this.#verificarMoneda(otro);
    return this.#centavos > otro.centavos;
  }

  menorQue(otro: Dinero): boolean {
    this.#verificarMoneda(otro);
    return this.#centavos < otro.centavos;
  }

  igualA(otro: Dinero): boolean {
    return this.#moneda === otro.moneda && this.#centavos === otro.centavos;
  }

  formatear(): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: this.#moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(this.pesos);
  }

  toString(): string { return this.formatear(); }
  toJSON(): { centavos: number; moneda: Moneda } {
    return { centavos: this.#centavos, moneda: this.#moneda };
  }
}
