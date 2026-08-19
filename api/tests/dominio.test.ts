import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Dinero } from '../src/domain/Dinero';
import { calcularSaldo, calcularSaldoImperativo, cupoDisponible, transaccionCuadra } from '../src/domain/saldo';
import { calcularCuota, generarAmortizacion, generarAmortizacionRecursiva, anualAMensual, resumenCredito } from '../src/domain/amortizacion';
import { evaluarReglas, evaluarImperativo, REQUISITOS_PRESTAMO } from '../src/domain/reglas';
import { calcularScore, evaluarSolicitud, bandaDe } from '../src/domain/scoring';
import { esValidoLuhn, generarNumeroTarjeta, ultimos4 } from '../src/domain/luhn';
import type { Solicitud } from '../src/domain/tipos';

describe('Dinero (Value Object)', () => {
  test('no acepta floats: 0.1 + 0.2 da exactamente 0.3', () => {
    const a = Dinero.dePesos(0.1);
    const b = Dinero.dePesos(0.2);
    assert.equal(a.sumar(b).centavos, 30);
    assert.equal(a.sumar(b).pesos, 0.3);
  });

  test('es inmutable: sumar devuelve una instancia nueva', () => {
    const a = Dinero.dePesos(1000);
    const b = a.sumar(Dinero.dePesos(500));
    assert.equal(a.pesos, 1000);
    assert.equal(b.pesos, 1500);
    assert.notEqual(a, b);
  });

  test('rechaza operar monedas distintas', () => {
    const cop = new Dinero(100, 'COP');
    const usd = new Dinero(100, 'USD');
    assert.throws(() => cop.sumar(usd), /No se puede operar/);
  });

  test('rechaza construccion con decimales', () => {
    assert.throws(() => new Dinero(10.5), TypeError);
  });
});

describe('Saldo (funcional puro)', () => {
  const asientos = [
    { centavos: 30_000_000, estado: 'POSTED' as const, fecha: '2026-07-25T10:00:00Z' },
    { centavos: -4_500_000, estado: 'POSTED' as const, fecha: '2026-07-25T10:00:00Z' },
    { centavos: -10_000_000, estado: 'POSTED' as const, fecha: '2026-07-25T10:00:00Z' },
  ];

  test('el saldo es la suma de los asientos', () => {
    assert.equal(calcularSaldo(asientos).pesos, 155_000);
  });

  test('la version funcional y la imperativa dan el mismo resultado', () => {
    assert.equal(
      calcularSaldo(asientos).centavos,
      calcularSaldoImperativo(asientos).centavos
    );
  });

  test('cuenta nueva sin asientos da cero', () => {
    assert.ok(calcularSaldo([]).esCero());
  });

  test('cupo disponible = cupo aprobado menos deuda', () => {
    const cupo = Dinero.dePesos(2_000_000);
    const deuda = [{ centavos: -35_000_000, estado: 'POSTED' as const, fecha: '2026-07-25T10:00:00Z' }];
    assert.equal(cupoDisponible(cupo, deuda).pesos, 1_650_000);
  });

  test('INVARIANTE: los asientos de una transferencia suman exactamente cero', () => {
    const transferencia = [
      { centavos: -4_500_000, estado: 'POSTED' as const, fecha: '2026-07-25T10:00:00Z' },
      { centavos:  4_500_000, estado: 'POSTED' as const, fecha: '2026-07-25T10:00:00Z' },
    ];
    assert.ok(transaccionCuadra(transferencia));
  });
});

describe('Amortizacion francesa', () => {
  const capital = Dinero.dePesos(3_000_000);
  const tasa = 0.02;
  const plazo = 12;

  test('la cuota se calcula con la formula francesa', () => {
    const cuota = calcularCuota(capital, tasa, plazo);
    assert.ok(Math.abs(cuota.pesos - 283_679) < 2, `cuota real: ${cuota.pesos}`);
  });

  test('la tabla tiene exactamente n filas', () => {
    assert.equal(generarAmortizacion(capital, tasa, plazo).length, 12);
  });

  test('INVARIANTE CLAVE: el saldo final es exactamente cero', () => {
    const tabla = generarAmortizacion(capital, tasa, plazo);
    assert.equal(tabla.at(-1)!.saldoRestante.centavos, 0);
  });

  test('la suma de los abonos a capital es igual al capital prestado', () => {
    const tabla = generarAmortizacion(capital, tasa, plazo);
    const suma = tabla.reduce((a, f) => a.sumar(f.abonoCapital), Dinero.cero());
    assert.equal(suma.centavos, capital.centavos);
  });

  test('el primer interes es capital x tasa', () => {
    const tabla = generarAmortizacion(capital, tasa, plazo);
    assert.equal(tabla[0]!.interes.pesos, 60_000);
  });

  test('el interes decrece y el abono a capital crece', () => {
    const tabla = generarAmortizacion(capital, tasa, plazo);
    for (let i = 1; i < tabla.length - 1; i++) {
      assert.ok(tabla[i]!.interes.centavos < tabla[i - 1]!.interes.centavos);
      assert.ok(tabla[i]!.abonoCapital.centavos > tabla[i - 1]!.abonoCapital.centavos);
    }
  });

  test('la version recursiva de cola da un resultado identico a la de reduce', () => {
    const a = generarAmortizacion(capital, tasa, plazo);
    const b = generarAmortizacionRecursiva(capital, tasa, plazo);
    assert.deepEqual(
      a.map((f) => f.cuota.centavos),
      b.map((f) => f.cuota.centavos)
    );
    assert.deepEqual(
      a.map((f) => f.saldoRestante.centavos),
      b.map((f) => f.saldoRestante.centavos)
    );
  });

  test('tasa cero: la cuota es capital dividido plazo', () => {
    const tabla = generarAmortizacion(Dinero.dePesos(1_200_000), 0, 12);
    assert.equal(tabla[0]!.cuota.pesos, 100_000);
    assert.equal(tabla.at(-1)!.saldoRestante.centavos, 0);
  });

  test('conversion de tasa anual efectiva a mensual efectiva', () => {
    const mensual = anualAMensual(0.2682417946);
    assert.ok(Math.abs(mensual - 0.02) < 0.0001);
  });
});

const solicitudBase: Solicitud = {
  edad: 24,
  antiguedadDias: 120,
  ingresoMensual: Dinero.dePesos(3_500_000),
  obligacionesEnMora: 0,
  montoSolicitado: Dinero.dePesos(3_000_000),
  cuotaEstimada: Dinero.dePesos(283_679),
  porcentajePagosPuntuales: 100,
  saldoPromedio: Dinero.dePesos(1_200_000),
  deudaTotal: Dinero.dePesos(0),
  parametros: {
    ingresoMinimo: Dinero.dePesos(1_423_500),
    montoMinimo: Dinero.dePesos(500_000),
    montoMaximo: Dinero.dePesos(20_000_000),
    maxCuotaIngreso: 0.30,
  },
};

describe('Motor de reglas (declarativo)', () => {
  test('una solicitud sana no incumple ninguna regla', () => {
    assert.equal(evaluarReglas(REQUISITOS_PRESTAMO, solicitudBase).length, 0);
  });

  test('cuenta muy nueva incumple RD-02 y solo esa', () => {
    const s = { ...solicitudBase, antiguedadDias: 5 };
    const fallos = evaluarReglas(REQUISITOS_PRESTAMO, s);
    assert.equal(fallos.length, 1);
    assert.equal(fallos[0]!.id, 'RD-02');
  });

  test('cuota mayor al 30% del ingreso incumple RD-06', () => {
    const s = { ...solicitudBase, ingresoMensual: Dinero.dePesos(800_000) };
    const ids = evaluarReglas(REQUISITOS_PRESTAMO, s).map((r) => r.id);
    assert.ok(ids.includes('RD-06'));
  });

  test('el motor declarativo y el imperativo detectan lo mismo', () => {
    const casos = [
      solicitudBase,
      { ...solicitudBase, edad: 15 },
      { ...solicitudBase, antiguedadDias: 5 },
      { ...solicitudBase, obligacionesEnMora: 2 },
      { ...solicitudBase, ingresoMensual: Dinero.dePesos(900_000) },
    ];
    for (const caso of casos) {
      assert.equal(
        evaluarReglas(REQUISITOS_PRESTAMO, caso).length,
        evaluarImperativo(caso).length
      );
    }
  });
});

describe('Scoring y decision', () => {
  test('el score queda entre 0 y 1000', () => {
    const score = calcularScore(solicitudBase);
    assert.ok(score >= 0 && score <= 1000, `score: ${score}`);
  });

  test('un perfil solido cae en banda A o B y se aprueba completo', () => {
    const r = evaluarSolicitud(solicitudBase, 0.24);
    assert.ok(r.aprobado);
    assert.ok(['A', 'B'].includes(r.banda), `banda: ${r.banda} score: ${r.score}`);
    assert.equal(r.montoAprobado.pesos, 3_000_000);
  });

  test('rechazo por requisito duro no calcula score', () => {
    const r = evaluarSolicitud({ ...solicitudBase, obligacionesEnMora: 3 }, 0.24);
    assert.equal(r.aprobado, false);
    assert.equal(r.score, null);
    assert.equal(r.motivos[0]!.id, 'RD-04');
  });

  test('todo rechazo trae un motivo explicito para el usuario', () => {
    const r = evaluarSolicitud({ ...solicitudBase, edad: 12 }, 0.24);
    assert.ok(r.motivos.length > 0);
    assert.ok(r.motivos[0]!.mensaje.length > 10);
  });

  test('peor historial de pagos baja el score', () => {
    const bueno = calcularScore(solicitudBase);
    const malo  = calcularScore({ ...solicitudBase, porcentajePagosPuntuales: 40 });
    assert.ok(malo < bueno);
  });

  test('las bandas cubren todo el rango sin huecos', () => {
    for (const score of [0, 499, 500, 649, 650, 799, 800, 1000]) {
      assert.ok(bandaDe(score), `sin banda para ${score}`);
    }
  });
});

describe('Luhn', () => {
  test('valida un numero de prueba conocido', () => {
    assert.ok(esValidoLuhn('4111111111111111'));
  });

  test('detecta un numero invalido', () => {
    assert.equal(esValidoLuhn('4111111111111112'), false);
  });

  test('los numeros generados siempre pasan la validacion', () => {
    for (let i = 0; i < 200; i++) {
      const n = generarNumeroTarjeta();
      assert.equal(n.length, 16);
      assert.ok(esValidoLuhn(n), `fallo con ${n}`);
    }
  });

  test('ultimos4 devuelve cuatro digitos', () => {
    assert.equal(ultimos4(generarNumeroTarjeta()).length, 4);
  });
});

describe('Resumen de credito (lo que ve el usuario al simular)', () => {
  test('el total pagado es mayor al capital y el interes cuadra', () => {
    const r = resumenCredito(Dinero.dePesos(3_000_000), 0.02, 12);
    assert.ok(r.totalPagado.pesos > 3_000_000);
    assert.equal(
      r.totalPagado.centavos - r.totalInteres.centavos,
      Dinero.dePesos(3_000_000).centavos
    );
  });
});
