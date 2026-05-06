# PRD - EcoVision AI

## 1. Visao geral

O EcoVision AI e uma aplicacao full stack para cadastro, registro, acompanhamento e triagem inicial de denuncias ambientais. O produto permite que usuarios autenticados registrem ocorrencias ambientais, visualizem indicadores operacionais em um dashboard e usem uma analise simples baseada em palavras-chave para estimar risco e prioridade de atendimento.

## 2. Problema

Equipes ambientais, projetos academicos, comunidades e orgaos locais frequentemente recebem denuncias ambientais de forma dispersa, sem padronizacao dos dados e sem uma visao rapida de severidade, status e locais mais recorrentes. Isso dificulta a priorizacao de vistorias e o acompanhamento das ocorrencias.

## 3. Objetivos

- Centralizar denuncias ambientais em uma base estruturada.
- Permitir acesso autenticado aos dados por meio de JWT.
- Exibir indicadores basicos para acompanhamento operacional.
- Apoiar a triagem inicial com analise automatizada por palavras-chave.
- Entregar uma interface simples, responsiva e facil de executar localmente.

## 4. Nao objetivos

- Substituir parecer tecnico ou vistoria ambiental oficial.
- Realizar analise de IA generativa ou modelo preditivo treinado.
- Gerenciar equipes de campo, ordens de servico ou workflow completo de fiscalizacao.
- Integrar automaticamente com mapas, sensores, imagens de satelite ou orgaos publicos.
- Fornecer aplicativo mobile nativo.

## 5. Publico-alvo

- Analistas ambientais que precisam registrar e acompanhar denuncias.
- Gestores de projetos ambientais que precisam visualizar indicadores.
- Comunidades, ONGs ou equipes academicas que desejam organizar ocorrencias ambientais.
- Desenvolvedores ou avaliadores que precisam demonstrar uma aplicacao full stack MVC.

## 6. Personas

### Analista ambiental

Precisa registrar uma denuncia rapidamente, informar localizacao, categoria e severidade, e verificar se o caso exige prioridade.

### Gestor ambiental

Precisa acompanhar o volume total de denuncias, quantidade de casos graves, pendencias e locais monitorados.

### Usuario avaliador

Precisa executar o projeto localmente, criar um usuario demo, autenticar e validar as principais rotas da API.

## 7. Escopo atual do MVP

### Frontend

- Tela de login.
- Criacao de usuario demo.
- Persistencia de sessao no `localStorage`.
- Dashboard protegido por token.
- Indicadores de denuncias.
- Formulario de nova denuncia.
- Listagem de denuncias ambientais.
- Painel de analise IA baseado nos dados digitados no formulario.
- Layout responsivo para desktop e mobile.

### Backend

- API Node.js com Express.
- Arquitetura MVC.
- Autenticacao com JWT.
- Criptografia de senha com `bcryptjs`.
- Persistencia em PostgreSQL.
- Rotas para usuarios, denuncias e analise.
- Middleware de autenticacao para rotas protegidas.

### Banco de dados

- Tabela `users`.
- Tabela `reports`.
- Indices por `status` e `severity`.
- Relacionamento opcional entre denuncia e usuario.

## 8. Jornadas principais

### 8.1 Cadastro e login

1. Usuario acessa a tela inicial.
2. Usuario informa email e senha ou cria o usuario demo.
3. Backend valida credenciais.
4. Sistema retorna JWT e dados basicos do usuario.
5. Frontend salva sessao e exibe o dashboard.

### 8.2 Registro de denuncia

1. Usuario autenticado preenche titulo, descricao, localizacao, categoria e severidade.
2. Frontend envia a denuncia para a API.
3. Backend valida campos obrigatorios.
4. Backend salva denuncia com `status = pendente`.
5. Dashboard atualiza indicadores e lista de denuncias.

### 8.3 Analise de risco

1. Usuario preenche ou edita os campos da denuncia.
2. Usuario aciona a analise.
3. Backend normaliza titulo, descricao e categoria.
4. Servico identifica palavras-chave de risco alto, medio ou baixo.
5. Frontend exibe risco, score, recomendacao e palavras encontradas.

### 8.4 Consulta operacional

1. Usuario autenticado acessa o dashboard.
2. Sistema busca indicadores e denuncias em paralelo.
3. Usuario visualiza total de denuncias, alta severidade, pendentes e locais monitorados.
4. Usuario consulta a lista ordenada por data de criacao mais recente.

## 9. Requisitos funcionais

### Usuarios e autenticacao

- RF01: O sistema deve permitir cadastrar usuario com nome, email e senha.
- RF02: O sistema deve impedir cadastro com email ja existente.
- RF03: O sistema deve armazenar senha como hash, nunca em texto puro.
- RF04: O sistema deve autenticar usuario por email e senha.
- RF05: O sistema deve retornar token JWT apos login valido.
- RF06: O sistema deve proteger listagem de usuarios, denuncias, indicadores e analise com token JWT.
- RF07: O frontend deve permitir logout e limpar a sessao local.
- RF08: O frontend deve permitir criar um usuario demo com credenciais conhecidas para teste local.

### Denuncias

- RF09: O sistema deve permitir criar denuncia com titulo, descricao, localizacao, categoria e severidade.
- RF10: O sistema deve exigir titulo, descricao, localizacao e categoria.
- RF11: O sistema deve usar severidade `media` como valor padrao quando nao informada.
- RF12: O sistema deve criar denuncias com status inicial `pendente`.
- RF13: O sistema deve relacionar a denuncia ao usuario autenticado.
- RF14: O sistema deve listar denuncias com dados do usuario criador quando disponivel.
- RF15: O sistema deve ordenar denuncias da mais recente para a mais antiga.

### Dashboard

- RF16: O sistema deve exibir total de denuncias registradas.
- RF17: O sistema deve exibir total de denuncias com severidade `alta`.
- RF18: O sistema deve exibir total de denuncias pendentes.
- RF19: O sistema deve exibir total de locais distintos monitorados.
- RF20: O dashboard deve atualizar indicadores apos nova denuncia.

### Analise IA

- RF21: O sistema deve analisar titulo, descricao e categoria.
- RF22: O sistema deve normalizar acentos e caixa antes da analise.
- RF23: O sistema deve identificar palavras-chave de risco alto, medio e baixo.
- RF24: O sistema deve retornar risco, score, recomendacao e palavras-chave encontradas.
- RF25: O frontend deve exibir o resultado da analise ao usuario.

## 10. Requisitos nao funcionais

- RNF01: A API deve responder em JSON.
- RNF02: O frontend deve funcionar com HTML, CSS e JavaScript puros.
- RNF03: O sistema deve executar localmente com backend em `http://localhost:3000`.
- RNF04: O layout deve ser responsivo para telas menores.
- RNF05: A API deve retornar mensagens claras para erros de validacao, autenticacao e rotas inexistentes.
- RNF06: Dados sensiveis como `JWT_SECRET` devem vir de variaveis de ambiente.
- RNF07: O projeto deve manter separacao MVC no backend.

## 11. Modelo de dados

### users

| Campo | Tipo | Regra |
| --- | --- | --- |
| id | SERIAL | Chave primaria |
| name | VARCHAR(120) | Obrigatorio |
| email | VARCHAR(160) | Obrigatorio e unico |
| password_hash | TEXT | Obrigatorio |
| created_at | TIMESTAMP | Padrao `CURRENT_TIMESTAMP` |

### reports

| Campo | Tipo | Regra |
| --- | --- | --- |
| id | SERIAL | Chave primaria |
| title | VARCHAR(180) | Obrigatorio |
| description | TEXT | Obrigatorio |
| location | VARCHAR(180) | Obrigatorio |
| category | VARCHAR(80) | Obrigatorio |
| severity | VARCHAR(20) | Obrigatorio, padrao `media` |
| status | VARCHAR(30) | Obrigatorio, padrao `pendente` |
| user_id | INTEGER | Referencia `users(id)`, `ON DELETE SET NULL` |
| created_at | TIMESTAMP | Padrao `CURRENT_TIMESTAMP` |

## 12. API

### Saude

- `GET /`: retorna nome do projeto, status e rotas principais.

### Usuarios

- `POST /users/register`: cria usuario.
- `POST /users/login`: autentica usuario e retorna JWT.
- `GET /users`: lista usuarios, requer JWT.

### Denuncias

- `GET /reports`: lista denuncias, requer JWT.
- `POST /reports`: cria denuncia, requer JWT.
- `GET /reports/stats`: retorna indicadores do dashboard, requer JWT.

### Analise

- `POST /analysis`: retorna analise de risco, requer JWT.

## 13. Categorias e severidades

### Categorias exibidas no frontend

- Queimada
- Desmatamento
- Residuos
- Saneamento
- Poluicao

### Severidades

- baixa
- media
- alta

## 14. Regra de analise de risco

### Palavras de risco alto

- desmatamento
- queimada
- incendio
- contaminacao
- oleo
- toxica

### Palavras de risco medio

- lixo
- esgoto
- poluicao
- erosao
- odor
- alagamento

### Palavras de risco baixo

- ruido
- podas
- entulho
- fumaca

### Resultado esperado

- Se houver palavra de risco alto: risco `alto`, score `90`, recomendacao de priorizar vistoria e acionar orgaos ambientais.
- Se houver palavra de risco medio e nenhuma de alto: risco `medio`, score `65`, recomendacao de triagem tecnica e monitoramento.
- Se houver palavra de risco baixo e nenhuma de alto ou medio: risco `baixo`, score `45`, recomendacao padrao.
- Se nao houver palavra-chave: risco `baixo`, score `35`, recomendacao padrao.

## 15. Criterios de aceite

- CA01: Dado um usuario novo, quando ele se cadastra com nome, email e senha validos, entao o sistema cria o usuario sem retornar senha.
- CA02: Dado um email ja cadastrado, quando o usuario tenta se cadastrar novamente, entao o sistema retorna erro de conflito.
- CA03: Dado um usuario valido, quando ele faz login, entao recebe token JWT e seus dados basicos.
- CA04: Dado um usuario sem token, quando acessa rotas protegidas, entao recebe erro 401.
- CA05: Dado um usuario autenticado, quando cria denuncia com campos obrigatorios, entao a denuncia e salva e aparece na lista.
- CA06: Dado uma denuncia criada, quando o dashboard recarrega, entao os indicadores refletem os dados atualizados.
- CA07: Dado texto contendo "queimada", quando o usuario executa analise, entao o sistema retorna risco alto.
- CA08: Dado texto contendo "esgoto", quando o usuario executa analise, entao o sistema retorna risco medio.
- CA09: Dado texto contendo "entulho", quando o usuario executa analise, entao o sistema retorna risco baixo com score 45.
- CA10: Dado logout, quando o usuario sai, entao token e usuario sao removidos do `localStorage`.

## 16. Metricas de sucesso

- Usuario consegue executar o fluxo demo em menos de 5 minutos apos configurar o banco.
- 100% das rotas protegidas rejeitam requisicoes sem JWT.
- Denuncia recem-criada aparece na listagem sem refresh manual da pagina.
- Indicadores do dashboard correspondem aos dados salvos no banco.
- Analise retorna score e recomendacao coerentes com as palavras-chave configuradas.

## 17. Riscos e limitacoes

- A analise de risco e baseada em palavras-chave e pode gerar falsos positivos ou falsos negativos.
- Nao existe controle de papeis/permissoes entre tipos de usuarios.
- Nao existe edicao, exclusao ou mudanca de status de denuncias.
- Nao ha paginacao, filtros ou busca na listagem.
- O frontend usa `localStorage`, que e simples para MVP, mas exige cuidado em ambientes reais.
- Nao ha testes automatizados documentados no estado atual.

## 18. Roadmap sugerido

### Proxima versao

- Adicionar filtros por categoria, severidade, status e localizacao.
- Permitir atualizar status da denuncia.
- Adicionar tela de detalhes da denuncia.
- Implementar paginacao na listagem.
- Criar testes automatizados para controllers, services e rotas.

### Evolucao intermediaria

- Adicionar perfis de usuario, como administrador, analista e visitante.
- Registrar historico de alteracoes de status.
- Adicionar upload de imagens ou evidencias.
- Integrar mapa para visualizacao por localizacao.
- Melhorar a analise com pesos configuraveis por categoria.

### Evolucao avancada

- Integrar modelo de IA ou servico externo para classificacao semantica.
- Criar painel geografico com heatmap de ocorrencias.
- Gerar relatorios exportaveis em PDF ou CSV.
- Adicionar notificacoes para casos de alta severidade.
- Disponibilizar deploy em ambiente cloud.

## 19. Dependencias tecnicas

- Node.js
- Express
- PostgreSQL
- JWT
- bcryptjs
- cors
- dotenv
- HTML, CSS e JavaScript no frontend

## 20. Fora do escopo para entrega atual

- Deploy em producao.
- CI/CD.
- Testes automatizados.
- Observabilidade e logs estruturados.
- Painel administrativo completo.
- Integracao com APIs externas.
