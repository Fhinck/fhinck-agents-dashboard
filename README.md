# AI Workforce Fhinck

Dashboard em tempo real para visualização de agentes de IA trabalhando.

## Visão Geral

O sistema exibe agentes como "bolinhas" conectadas em uma rede visual. Quando um agente inicia um trabalho, sua bolinha recebe foco (aumenta de tamanho) e a borda anima como se estivesse "falando". Ao finalizar, volta ao estado normal.

## Stack Tecnológica

- **Frontend**: HTML/CSS/JavaScript (Vanilla)
- **Build Tool**: Vite
- **Hospedagem**: Firebase Hosting
- **Banco de Dados**: Firestore (real-time)
- **Automação**: n8n (envia eventos para o Firestore)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative o Firestore Database
3. Copie as credenciais do projeto
4. Crie o arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

5. Preencha as variáveis com suas credenciais Firebase

### 3. Popular o banco de dados (opcional)

Para adicionar agentes de teste:

```bash
# Baixe a chave de serviço do Firebase Console
# Coloque em: serviceAccountKey.json

npm run seed
```

### 4. Executar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

### 5. Build para produção

```bash
npm run build
```

### 6. Deploy

```bash
# Login no Firebase (primeira vez)
firebase login

# Configurar projeto
firebase use YOUR_PROJECT_ID

# Deploy
npm run deploy
```

## Estrutura do Projeto

```
├── index.html              # HTML principal
├── src/
│   ├── js/
│   │   ├── app.js              # Inicialização
│   │   ├── firebase-config.js  # Configuração Firebase
│   │   ├── agents-store.js     # Estado dos agentes
│   │   ├── animation-queue.js  # Fila de animações
│   │   └── renderer.js         # Renderização visual
│   └── styles/
│       ├── main.css            # Estilos principais
│       └── animations.css      # Animações
├── public/
│   └── assets/
│       └── icons/              # Ícones
├── scripts/
│   ├── seed-firestore.js       # Script para popular banco
│   └── simulator.html          # Simulador para testes
├── firebase.json               # Config Firebase Hosting
├── firestore.rules             # Regras de segurança
└── firestore.indexes.json      # Índices do Firestore
```

## Estrutura do Firestore

### Coleção: `agents`

```javascript
{
  id: "agent_kai",
  name: "Agent KAI",
  type: "Conversational Architect",
  icon: "message-circle",
  color: "#FF8C42",
  status: "idle",          // "idle" | "working"
  currentTask: null,
  lastActivityAt: Timestamp,
  createdAt: Timestamp,
  position: { x: 0.5, y: 0.5 }
}
```

### Coleção: `activity`

```javascript
{
  agentId: "agent_kai",
  event: "start",          // "start" | "end"
  task: "Processing request",
  timestamp: Timestamp,
  duration: null,
  metadata: {}
}
```

## Integração com n8n

O n8n deve enviar webhooks para atualizar o status dos agentes:

### Webhook de Entrada

```
POST /webhook/agent-activity
{
  "agentId": "agent_kai",
  "event": "start",
  "task": "Processing user request",
  "metadata": {}
}
```

### Ações do n8n

**Quando `event: "start"`:**
- Atualizar `agents/{agentId}.status` para "working"
- Adicionar registro em `activity/`

**Quando `event: "end"`:**
- Atualizar `agents/{agentId}.status` para "idle"
- Adicionar registro em `activity/`

## Testando

Abra `scripts/simulator.html` no navegador para simular eventos de agentes sem precisar do Firebase configurado.

## Licença

MIT
