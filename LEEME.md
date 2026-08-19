# Banco MVP — Plataforma Web & API Backend

## 🚀 Guía Rápida

### Paso 1: Base de Datos en Supabase

1. Ingresa a [supabase.com](https://supabase.com) y crea un nuevo proyecto `banco-mvp`.
2. En el **SQL Editor → New query**, ejecuta los scripts de la carpeta `db/` en este orden estricto:
   - `1` → `db/01_schema.sql`
   - `2` → `db/02_functions.sql`
   - `3` → `db/04_seed.sql`
3. Copia tus claves en **Settings → API**: Project URL, `anon` key y `service_role` key.
4. *(Opcional)* En el SQL Editor verifica corriendo `select verificar_cuadre();` (debe devolver `0`).

---

### Paso 2: Iniciar el Backend API

Abre una terminal en la raíz de tu proyecto:

```powershell
cd api
npm install
copy .env.example .env
npm test
npm run typecheck
npm run dev
```

El backend estará corriendo en `http://localhost:3000`.

---

### Paso 3: Iniciar la Aplicación Web

Abre una segunda terminal:

```powershell
cd web
npm install
npm run typecheck
npm run dev
```

La aplicación web se abrirá en `http://localhost:5173`.

---

## 📁 Estructura del Proyecto

```
banco-mvp/
├── db/                    Scripts SQL para Supabase (Schema, Funciones, Seed)
├── api/                   Backend Node.js + Express + TypeScript
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts       Punto de entrada del servidor API
│   │   ├── middleware.ts  Validación de tokens de sesión
│   │   ├── domain/        ← Lógica pura de dominio (sin BD ni HTTP)
│   │   ├── routes/        Rutas HTTP (Express)
│   │   └── repos/         Clientes e integración con Supabase
│   └── tests/             Suite de 33 pruebas unitarias de dominio
└── web/                   Aplicación Web React 18 + Vite 6 + TypeScript
    ├── index.html         Estructura base HTML5 y fuentes Google
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── index.css      Sistema de diseño Glassmorphic & Dark Mode
        ├── App.tsx        Navegación principal y autenticación
        ├── components/    Componentes UI (Dashboard, Transferencias, Tarjetas, Créditos, etc.)
        └── lib/           Cliente API y Supabase
```

### La Carpeta Domain (Lógica de Dominio en Backend)

| Archivo | Paradigma | Qué hace |
|---|---|---|
| `tipos.ts` | Tipado estático | Union types, discriminated unions |
| `Dinero.ts` | OOP — Value Object | Inmutable, en centavos enteros. Nunca float. |
| `saldo.ts` | Funcional | `reduce` sobre el ledger. Incluye la versión imperativa para comparar. |
| `amortizacion.ts` | Funcional | Sistema francés. Dos versiones: `reduce` y recursión de cola. |
| `reglas.ts` | Declarativo | Motor de reglas como datos. |
| `scoring.ts` | Declarativo | Factores ponderados como configuración. |
| `luhn.ts` | Funcional | Validación de tarjetas con algoritmo de Luhn. |

---

## 🛠️ Comandos de Uso Frecuente

### En la carpeta `api/`:
```powershell
npm run dev        # Iniciar servidor backend con hot-reload (puerto 3000)
npm test           # Ejecutar los 33 tests de dominio
npm run typecheck  # Validar tipos TypeScript
```

### En la carpeta `web/`:
```powershell
npm run dev        # Iniciar servidor web de desarrollo (puerto 5173)
npm run typecheck  # Validar tipos TypeScript
npm run build      # Generar paquete de producción en web/dist
```

---

## ❓ Solución de Problemas Frecuentes

| Síntoma | Causa casi siempre | Solución |
|---|---|---|
| `Network request failed` en la web | El servidor `api` no está corriendo | Asegúrate de haber ejecutado `npm run dev` dentro de `api/` |
| `Faltan variables en el archivo .env` | No copiaste `.env.example` a `.env` en `api/` | Copia `.env.example` a `.env` y coloca las claves de Supabase |
| `relation "profiles" does not exist` | Corriste `02_functions.sql` antes que `01_schema.sql` | Ejecuta los scripts en el orden numérico indicado (`01` -> `02`) |
| `listen EADDRINUSE :::3000` | El puerto 3000 ya está ocupado | Cierra el proceso anterior o finaliza Node en el Administrador de tareas |
