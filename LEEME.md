# Banco MVP — Plataforma Web & API Backend (Base de Datos Local)

## 🚀 Guía Rápida

### Paso 1: Iniciar el Backend API (Base de Datos Local Cero-Configuración)

Abre una terminal en la raíz de tu proyecto:

```powershell
cd api
npm install
npm test
npm run typecheck
npm run dev
```

El backend se iniciará en `http://localhost:3000`. Al arrancar por primera vez, creará e inicializará automáticamente la base de datos local embebida (`PGlite`) ejecutando los esquemas, tablas, tipos y funciones bancarias almacenadas en `db/`.

*(Opcional)* Si prefieres utilizar un servidor PostgreSQL local ya existente en tu equipo, puedes crear un archivo `.env` en `api/` definiendo `DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_bd`.

---

### Paso 2: Iniciar la Aplicación Web

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
├── db/                    Scripts SQL de estructura bancaria (Schema, Funciones, Seed)
├── api/                   Backend Node.js + Express + TypeScript + BD Local (PGlite/PostgreSQL)
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts       Punto de entrada del servidor API e inicializador de BD
│   │   ├── middleware.ts  Validación de tokens de sesión JWT
│   │   ├── domain/        ← Lógica pura de dominio (sin BD ni HTTP)
│   │   ├── routes/        Rutas HTTP (Express) e integración local
│   │   └── repos/         Manejador de base de datos local (db.ts)
│   └── tests/             Suite de 33 pruebas unitarias de dominio
└── web/                   Aplicación Web React 18 + Vite 6 + TypeScript
    ├── index.html         Estructura base HTML5 y fuentes Google
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── index.css      Sistema de diseño Glassmorphic & Dark Mode
        ├── App.tsx        Navegación principal y autenticación
        ├── components/    Componentes UI (Dashboard, Transferencias, Tarjetas, Créditos, etc.)
        └── lib/           Cliente API y gestión de sesiones locales (auth.ts)
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
| `listen EADDRINUSE :::3000` | El puerto 3000 ya está ocupado | Cierra el proceso anterior o finaliza Node en el Administrador de tareas |
