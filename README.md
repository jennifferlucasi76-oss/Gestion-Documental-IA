# SGDI-IA — Prototipo de Gestión Documental Basado en Inteligencia Artificial

Proyecto de Integración Curricular — Universidad de Guayaquil  
Facultad de Ciencias Matemáticas y Físicas — Carrera de Tecnologías de la Información  
**Autores:** Crespin Mera Ángel Santiago & Lucas Iñiga Jenniffer Lilibeth  
**Itinerario:** Seguridad

---

## Arquitectura del Prototipo

- **Frontend y API (Vercel):** Next.js (App Router + TypeScript + Tailwind CSS)
- **Base de Datos Relacional + Vectorial + Auth + Storage:** Supabase (PostgreSQL + `pgvector` + RLS)
- **IA (Embeddings + Extracción PLN):** Google Gemini API (o OpenAI)
- **Clasificación Supervisada:** Modelo entrenado en Google Colab/Python sobre *embeddings* y exportado a pesos JSON para inferencia rápida en Next.js.

## Estructura Inicial

```text
├── .env.example                 # Plantilla de variables de entorno
├── supabase/
│   └── schema.sql               # Tablas, pgvector, RLS, Storage y función match_documents
└── src/
    ├── app/
    │   ├── api/health/route.ts  # Endpoint de verificación del servicio
    │   ├── layout.tsx
    │   └── page.tsx             # Panel inicial de estado del prototipo
    └── lib/
        ├── document-parser.ts   # Extracción y limpieza de .pdf / .docx + chunking
        ├── security.ts          # Validación de archivos, sanitización y SHA-256
        └── supabase/
            ├── client.ts        # Cliente navegador
            └── server.ts        # Cliente servidor (cookies SSR)
```

## Pasos para arrancar en local

1. **Crear proyecto en Supabase** y ejecutar el contenido completo de `supabase/schema.sql` dentro de **SQL Editor**.
2. **Copiar `.env.example` como `.env.local`** y llenar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
3. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
4. Abrir `http://localhost:3000`.
