# EcoVision AI

## 1. Visão geral

O **EcoVision AI** é uma plataforma web para registrar, acompanhar e analisar denúncias ambientais.

A aplicação permite que um usuário faça login, cadastre ocorrências ambientais, acompanhe indicadores em um dashboard, visualize alertas automáticos e consulte ocorrências em um mapa interativo.

## 2. Objetivo do projeto

O objetivo da plataforma é apoiar o monitoramento ambiental por meio de uma interface simples, visual e inteligente.

A solução ajuda a organizar denúncias ambientais, identificar situações críticas e facilitar a tomada de decisão.

## 3. Tecnologias utilizadas

### Frontend

- HTML
- CSS
- JavaScript
- Chart.js
- Leaflet

### Backend

- Node.js
- Express
- JWT
- bcryptjs

### Banco de dados

- PostgreSQL
- Banco local em arquivo para desenvolvimento

## 4. Funcionalidades principais

### Login de usuário

O sistema possui autenticação com email e senha.

Usuário de teste:

```text
Email: ana@ecovision.com
Senha: 123456
```

### Dashboard inteligente

O dashboard exibe indicadores ambientais e operacionais, como:

- Total de denúncias
- Denúncias de alta severidade
- Denúncias pendentes
- Locais monitorados
- Qualidade do ar
- Temperatura
- Umidade
- CO₂

### Gráficos ambientais

A plataforma utiliza gráficos para acompanhar dados ambientais ao longo do tempo.

Tecnologia usada:

```text
Chart.js
```

### Mapa interativo

O sistema possui um mapa interativo para visualizar pontos de ocorrências ambientais.

Tecnologia usada:

```text
Leaflet
OpenStreetMap
```

Observação: o mapa é real, mas os pontos atuais são demonstrativos, pois as denúncias ainda não possuem latitude e longitude reais cadastradas.

### Sistema de alertas automáticos

A plataforma gera alertas quando algum indicador ambiental sai do nível normal.

Exemplo:

```text
Nível de poluição acima do recomendado!
```

Canais previstos:

- Notificação no sistema
- Email
- SMS

Nesta versão, email e SMS estão simulados.

### Cadastro de denúncias ambientais

O usuário pode cadastrar uma denúncia informando:

- Título
- Descrição
- Localização
- Categoria
- Severidade
- Evidência fotográfica

Categorias disponíveis:

- Queimada
- Desmatamento
- Resíduos
- Saneamento
- Poluição

### Upload de imagens

A plataforma permite anexar uma imagem como evidência da denúncia ambiental.

Formatos aceitos:

- PNG
- JPG
- WebP

Limite por imagem:

```text
3 MB
```

A imagem enviada aparece como miniatura no card da denúncia.

### Análise IA

A plataforma possui uma análise simples baseada em palavras-chave.

Ela identifica termos de risco e retorna:

- Nível de risco
- Score
- Recomendação
- Palavras-chave encontradas

Exemplo:

```text
Risco alto - score 90
Priorizar vistoria, acionar órgãos ambientais e coletar evidências.
```

### Filtros de denúncias

É possível filtrar denúncias por:

- Status
- Severidade
- Categoria
- Localização

### Alteração de status

Cada denúncia pode ter seu status alterado.

Status disponíveis:

- Pendente
- Em análise
- Resolvida
- Arquivada

## 5. Como executar o projeto

### Backend

Abra o terminal na pasta do backend:

```powershell
cd "C:\Users\Wagner\Documents\cogmo\EcoVision AI\backend"
npm start
```

O backend será iniciado em:

```text
http://localhost:3000
```

### Frontend

Abra outro terminal na pasta do frontend:

```powershell
cd "C:\Users\Wagner\Documents\cogmo\EcoVision AI\frontend"
python -m http.server 5500
```

Depois acesse no navegador:

```text
http://127.0.0.1:5500/
```

## 6. Estrutura do projeto

```text
EcoVision AI
├── backend
│   ├── src
│   │   ├── controllers
│   │   ├── models
│   │   ├── routes
│   │   ├── services
│   │   └── app.js
│   └── package.json
├── frontend
│   ├── css
│   ├── js
│   └── index.html
├── README.md
├── PRD.md
└── RELATORIO_ECOVISION_AI.md
```

## 7. Próximas melhorias

- Usar coordenadas reais nas denúncias
- Integrar envio real de email
- Integrar envio real de SMS
- Criar cadastro de perfis de usuário
- Adicionar upload de imagens
- Gerar relatórios em PDF
- Melhorar a análise com IA generativa

## 8. Conclusão

O EcoVision AI demonstra como a tecnologia pode apoiar o monitoramento ambiental.

A plataforma combina cadastro de denúncias, dashboard inteligente, mapa interativo, alertas automáticos e análise de risco para ajudar na identificação e priorização de ocorrências ambientais.
