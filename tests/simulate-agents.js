/**
 * Simulador de Agentes AI
 * Envia eventos para o Firestore em tempo real para testar o dashboard
 *
 * Uso:
 *   node tests/simulate-agents.js                    # Cenário padrão
 *   node tests/simulate-agents.js --scenario=full   # Cenário completo
 *   node tests/simulate-agents.js --loop            # Loop contínuo
 *   node tests/simulate-agents.js --fast            # Velocidade rápida
 */

import { db } from './firebase-config.js';
import { Timestamp } from 'firebase-admin/firestore';

// Configuração
const PROJECT_ID = 'fhinck-api';

// Parse argumentos
const args = process.argv.slice(2);
const isLoop = args.includes('--loop');
const isFast = args.includes('--fast');
const scenarioArg = args.find(a => a.startsWith('--scenario='));
const scenario = scenarioArg ? scenarioArg.split('=')[1] : 'default';

// Tempos (em ms)
const DELAY = isFast ? 500 : 2000;
const TASK_DURATION = isFast ? 3000 : 8000;

// Cores dos agentes
const AGENT_COLORS = {
  'fhinck-master-protocol': '#8B5CF6',  // Roxo
  'base-specialist': '#3B82F6',          // Azul
  'code-architect': '#10B981',           // Verde
  'test-runner': '#F59E0B',              // Amarelo
  'doc-writer': '#EC4899',               // Rosa
  'security-auditor': '#EF4444'          // Vermelho
};

// Tarefas exemplo
const TASKS = {
  'fhinck-master-protocol': [
    '# Implement GAP-008: Data Transfer Objects (DTOs)\n\n## Context\n- fhinck-api project\n- JavaScript only\n\n## Task\nImplement the DTO pattern for transferring data between layers.',
    '# Implement GAP-009: Repository Pattern\n\n## Task\nCreate repository interfaces for data access abstraction.',
    '# Code Review: Authentication Module\n\n## Task\nReview and approve changes to the authentication system.'
  ],
  'base-specialist': [
    'Criando arquivo src/application/dtos/UserDTO.js',
    'Editando src/config/database.js',
    'Lendo arquivos de configuração do projeto',
    'Analisando estrutura de diretórios'
  ],
  'code-architect': [
    'Refatorando arquitetura de módulos',
    'Criando diagrama de dependências',
    'Implementando padrão Factory',
    'Otimizando imports circulares'
  ],
  'test-runner': [
    'Executando suite de testes unitários',
    'Rodando testes de integração',
    'Validando cobertura de código',
    'Gerando relatório de testes'
  ],
  'doc-writer': [
    'Atualizando README.md',
    'Gerando documentação da API',
    'Criando guia de contribuição',
    'Documentando endpoints REST'
  ],
  'security-auditor': [
    'Verificando vulnerabilidades OWASP',
    'Auditando dependências npm',
    'Analisando permissões de arquivos',
    'Validando sanitização de inputs'
  ]
};

// Ações detalhadas para histórico
const ACTIONS = [
  { action: 'Lendo arquivo', detail: 'src/config/index.js' },
  { action: 'Lendo arquivo', detail: 'package.json' },
  { action: 'Analisando código', detail: 'src/services/auth.js' },
  { action: 'Criando arquivo', detail: 'src/dtos/UserDTO.js' },
  { action: 'Editando arquivo', detail: 'src/routes/api.js' },
  { action: 'Executando comando', detail: 'npm run test' },
  { action: 'Executando comando', detail: 'npm run build' },
  { action: 'Chamando sub-agente', detail: 'base-specialist' },
  { action: 'Buscando no código', detail: 'class.*Repository' },
  { action: 'Validando tipos', detail: 'typescript --noEmit' }
];

/**
 * Gera um ID de sessão único
 */
function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Seleciona item aleatório de um array
 */
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Aguarda um tempo
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Envia evento de agente para o Firestore
 * Estrutura: project/{projectId}/agents/{agentId}
 */
async function sendAgentEvent(agentId, event, task = '', additionalData = {}) {
  const docRef = db.collection('project').doc(PROJECT_ID).collection('agents').doc(agentId);

  // Mapeia event para status (como o agents-store espera)
  const status = event === 'start' ? 'working' : 'idle';

  const data = {
    agentId,
    agentName: formatAgentName(agentId),
    agentColor: AGENT_COLORS[agentId] || '#FF6B35',
    projectName: PROJECT_ID,
    // Campos que o agents-store.js espera
    status,
    currentTask: task,
    createdAt: Timestamp.now(),
    // Campos adicionais para histórico/debug
    event,
    task,
    timestamp: Timestamp.now(),
    sessionId: generateSessionId(),
    model: 'claude-3-opus',
    branch: 'feature/gap-008-dtos',
    ...additionalData
  };

  await docRef.set(data);

  const icon = event === 'start' ? '🟢' : event === 'end' ? '🔴' : '🔵';
  console.log(`${icon} [${formatAgentName(agentId)}] ${event.toUpperCase()}${task ? ': ' + task.substring(0, 50) + '...' : ''}`);

  return data;
}

/**
 * Formata nome do agente
 */
function formatAgentName(agentId) {
  return agentId
    .replace(/^fhinck[-_]/i, '')
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Simula uma tarefa de agente
 */
async function simulateAgentTask(agentId, task, duration = TASK_DURATION) {
  // Evento de início
  await sendAgentEvent(agentId, 'start', task);

  // Simula ações durante a tarefa
  const numActions = Math.floor(duration / DELAY) - 1;
  for (let i = 0; i < numActions; i++) {
    await sleep(DELAY);
    const action = randomItem(ACTIONS);
    // Podemos enviar eventos intermediários se quisermos
    // await sendAgentEvent(agentId, 'tool_use', '', { toolData: action });
  }

  await sleep(DELAY);

  // Evento de fim
  await sendAgentEvent(agentId, 'end', '');
}

/**
 * Limpa todos os agentes do projeto
 * Estrutura: project/{projectId}/agents/{agentId}
 */
async function clearAllAgents() {
  console.log('\n🧹 Limpando agentes anteriores...');

  const snapshot = await db.collection('project').doc(PROJECT_ID).collection('agents').get();
  const batch = db.batch();

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`   Removidos ${snapshot.size} agentes\n`);
}

// ============================================
// CENÁRIOS DE TESTE
// ============================================

/**
 * Cenário padrão - demonstração básica
 */
async function scenarioDefault() {
  console.log('\n📋 Cenário: Default (demonstração básica)\n');

  // Master inicia tarefa principal
  await sendAgentEvent('fhinck-master-protocol', 'start', TASKS['fhinck-master-protocol'][0]);
  await sleep(DELAY);

  // Base specialist começa a trabalhar
  await sendAgentEvent('base-specialist', 'start', randomItem(TASKS['base-specialist']));
  await sleep(TASK_DURATION);

  // Base termina
  await sendAgentEvent('base-specialist', 'end');
  await sleep(DELAY);

  // Code architect entra
  await sendAgentEvent('code-architect', 'start', randomItem(TASKS['code-architect']));
  await sleep(TASK_DURATION);

  // Code architect termina
  await sendAgentEvent('code-architect', 'end');
  await sleep(DELAY);

  // Master finaliza
  await sendAgentEvent('fhinck-master-protocol', 'end');
}

/**
 * Cenário completo - todos os agentes
 */
async function scenarioFull() {
  console.log('\n📋 Cenário: Full (todos os agentes)\n');

  const agents = Object.keys(AGENT_COLORS);

  // Master inicia
  await sendAgentEvent('fhinck-master-protocol', 'start', TASKS['fhinck-master-protocol'][0], {
    progress: 0
  });
  await sleep(DELAY);

  // Todos os outros agentes trabalham em paralelo
  const otherAgents = agents.filter(a => a !== 'fhinck-master-protocol');

  for (let i = 0; i < otherAgents.length; i++) {
    const agent = otherAgents[i];
    await sendAgentEvent(agent, 'start', randomItem(TASKS[agent] || TASKS['base-specialist']));
    await sleep(DELAY / 2);

    // Atualiza progresso do master
    const progress = Math.round(((i + 1) / otherAgents.length) * 80);
    await sendAgentEvent('fhinck-master-protocol', 'start', TASKS['fhinck-master-protocol'][0], {
      progress
    });
  }

  // Aguarda um pouco
  await sleep(TASK_DURATION);

  // Finaliza todos
  for (const agent of otherAgents.reverse()) {
    await sendAgentEvent(agent, 'end');
    await sleep(DELAY / 2);
  }

  // Master finaliza
  await sendAgentEvent('fhinck-master-protocol', 'end');
}

/**
 * Cenário sequencial - um agente por vez
 */
async function scenarioSequential() {
  console.log('\n📋 Cenário: Sequential (um por vez)\n');

  const agents = ['fhinck-master-protocol', 'base-specialist', 'code-architect', 'test-runner'];

  for (const agent of agents) {
    const task = randomItem(TASKS[agent] || TASKS['base-specialist']);
    await simulateAgentTask(agent, task);
    await sleep(DELAY);
  }
}

/**
 * Cenário de stress - muitas atualizações rápidas
 */
async function scenarioStress() {
  console.log('\n📋 Cenário: Stress (atualizações rápidas)\n');

  const agents = Object.keys(AGENT_COLORS);

  for (let round = 0; round < 3; round++) {
    console.log(`\n--- Round ${round + 1} ---\n`);

    // Inicia todos rapidamente
    for (const agent of agents) {
      await sendAgentEvent(agent, 'start', randomItem(TASKS[agent] || TASKS['base-specialist']));
      await sleep(100);
    }

    await sleep(2000);

    // Finaliza todos rapidamente
    for (const agent of agents) {
      await sendAgentEvent(agent, 'end');
      await sleep(100);
    }

    await sleep(1000);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('     🤖 Simulador de Agentes AI - Fhinck Dashboard');
  console.log('═══════════════════════════════════════════════════');
  console.log(`\n📦 Projeto: ${PROJECT_ID}`);
  console.log(`⚡ Velocidade: ${isFast ? 'Rápida' : 'Normal'}`);
  console.log(`🔄 Loop: ${isLoop ? 'Sim' : 'Não'}`);
  console.log(`🎬 Cenário: ${scenario}`);

  await clearAllAgents();

  do {
    switch (scenario) {
      case 'full':
        await scenarioFull();
        break;
      case 'sequential':
        await scenarioSequential();
        break;
      case 'stress':
        await scenarioStress();
        break;
      default:
        await scenarioDefault();
    }

    if (isLoop) {
      console.log('\n⏳ Aguardando 5s para próximo ciclo... (Ctrl+C para parar)\n');
      await sleep(5000);
      await clearAllAgents();
    }
  } while (isLoop);

  console.log('\n✅ Simulação concluída!');
  console.log('💡 Abra o dashboard em http://localhost:3001 para ver os resultados\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
