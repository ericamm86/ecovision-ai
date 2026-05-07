# EcoVision AI

Projeto full stack para apresentação institucional, login, dashboard, cadastro de denúncias ambientais e análise simples com IA baseada em palavras-chave.

## Tecnologias

- Backend: Node.js, Express, PostgreSQL, JWT
- Frontend: HTML, CSS e JavaScript
- Arquitetura: MVC

## Estrutura atual

- `backend`: API Express principal e servidor do produto.
- `frontend`: app operacional com login, dashboard, mapa, sensores, denúncias e análise IA.
- `backend/sql/site-ecovision-ai`: protótipo visual usado como base da apresentação.

O fluxo principal agora roda pelo backend:

- `/`: apresentação EcoVision AI
- `/ecovision`: apresentação EcoVision AI
- `/app`: app operacional
- `/health`: status da API

## Como executar sem PostgreSQL

O arquivo `backend/.env` já pode usar `USE_FILE_DB=true`, que salva dados em `backend/data/dev-db.json`.

```bash
cd backend
npm install
npm start
```

Depois abra:

```text
http://localhost:3000
```

## Como executar com PostgreSQL

1. Crie o banco PostgreSQL:

```sql
CREATE DATABASE ecovision_ai;
```

2. Execute o schema:

```bash
psql -U postgres -d ecovision_ai -f backend/sql/schema.sql
psql -U postgres -d ecovision_ai -f backend/sql/seed.sql
```

3. Configure o backend com `USE_FILE_DB=false`:

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

4. Abra o produto:

```text
http://localhost:3000
```

## Deploy na Vercel

O projeto j&aacute; inclui `vercel.json`, `api/index.js` e um `package.json` na raiz para publicar o Express como fun&ccedil;&atilde;o serverless.

Na Vercel, importe o reposit&oacute;rio e mantenha a raiz do projeto como o diret&oacute;rio principal do reposit&oacute;rio.

Configure as vari&aacute;veis de ambiente:

```text
USE_FILE_DB=false
DATABASE_URL=sua_url_postgres
JWT_SECRET=um_segredo_forte
JWT_EXPIRES_IN=1d
```

Para produ&ccedil;&atilde;o, use PostgreSQL externo, como Neon, Supabase ou outro provedor. O modo `USE_FILE_DB=true` &eacute; indicado apenas para desenvolvimento local.

Depois do deploy, valide:

```text
/
/ecovision
/app
/health
```

## Rotas da API

- `POST /users/register`: cria usuario
- `POST /users/login`: autentica e retorna JWT
- `GET /users`: lista usuarios autenticados
- `GET /reports`: lista denuncias
- `POST /reports`: cria denuncia
- `GET /reports/stats`: indicadores do dashboard
- `POST /analysis`: analise simples de risco ambiental
