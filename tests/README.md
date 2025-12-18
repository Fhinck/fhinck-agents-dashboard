# Testes do Dashboard

Scripts para simular atividade de agentes AI no Firestore.

## Estrutura Firestore

Os testes usam a estrutura hierárquica:
```
project/{projectId}/agents/{agentId}
```

Exemplo: `project/fhinck-api/agents/base-specialist`

## Setup

### 1. Service Account (Recomendado)

Para autenticação completa, baixe o service account do Firebase:

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Vá em **Project Settings > Service Accounts**
3. Clique em **Generate new private key**
4. Salve o arquivo como `tests/service-account.json`

### 2. Sem Service Account

Os testes funcionam com Application Default Credentials (ADC).
Execute `gcloud auth application-default login` se necessário.

## Scripts Disponíveis

### Simulador Automático

```bash
# Cenário padrão (demonstração básica)
npm run test:sim

# Cenário completo (todos os agentes)
npm run test:sim:full

# Loop contínuo (repete indefinidamente)
npm run test:sim:loop

# Velocidade rápida
npm run test:sim:fast
```

### Modo Interativo

```bash
npm run test:interactive
```

Permite controlar manualmente:
- Iniciar/parar agentes individualmente
- Definir tarefas e progresso
- Listar agentes ativos
- Limpar todos os agentes

## Cenários

| Cenário | Descrição |
|---------|-----------|
| `default` | Master + 2 agentes sequenciais |
| `full` | Todos os 6 agentes em paralelo |
| `sequential` | Um agente por vez |
| `stress` | Muitas atualizações rápidas |

## Exemplos

```bash
# Teste rápido
node tests/simulate-agents.js --fast

# Cenário de stress em loop
node tests/simulate-agents.js --scenario=stress --loop

# Interativo
node tests/interactive.js
```

## Agentes Simulados

| ID | Nome | Cor |
|----|------|-----|
| fhinck-master-protocol | Master Protocol | Roxo |
| base-specialist | Base Specialist | Azul |
| code-architect | Code Architect | Verde |
| test-runner | Test Runner | Amarelo |
| doc-writer | Doc Writer | Rosa |
| security-auditor | Security Auditor | Vermelho |
