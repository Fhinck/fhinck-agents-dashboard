/**
 * Testes Interativos - Controle Manual
 * Permite enviar eventos individuais para testar o dashboard
 *
 * Uso: node tests/interactive.js
 */

import { db } from './firebase-config.js';
import { Timestamp } from 'firebase-admin/firestore';
import readline from 'readline';

const PROJECT_ID = 'fhinck-api';

// Agentes disponíveis
const AGENTS = {
  '1': { id: 'fhinck-master-protocol', name: 'Master Protocol', color: '#8B5CF6' },
  '2': { id: 'base-specialist', name: 'Base Specialist', color: '#3B82F6' },
  '3': { id: 'code-architect', name: 'Code Architect', color: '#10B981' },
  '4': { id: 'test-runner', name: 'Test Runner', color: '#F59E0B' },
  '5': { id: 'doc-writer', name: 'Doc Writer', color: '#EC4899' },
  '6': { id: 'security-auditor', name: 'Security Auditor', color: '#EF4444' }
};

// Interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function sendEvent(agentId, agentName, agentColor, event, task = '', progress = null) {
  // Estrutura: project/{projectId}/agents/{agentId}
  const docRef = db.collection('project').doc(PROJECT_ID).collection('agents').doc(agentId);

  // Mapeia event para status (como o agents-store espera)
  const status = event === 'start' ? 'working' : 'idle';

  const data = {
    agentId,
    agentName,
    agentColor,
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
    branch: 'feature/test'
  };

  if (progress !== null) {
    data.progress = progress;
  }

  await docRef.set(data);
  console.log(`\n✅ Evento enviado: ${agentName} -> ${event}`);
}

async function clearAll() {
  // Estrutura: project/{projectId}/agents/{agentId}
  const snapshot = await db.collection('project').doc(PROJECT_ID).collection('agents').get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`\n🧹 ${snapshot.size} agentes removidos`);
}

async function listAgents() {
  // Estrutura: project/{projectId}/agents/{agentId}
  const snapshot = await db.collection('project').doc(PROJECT_ID).collection('agents').get();

  if (snapshot.empty) {
    console.log('\n📭 Nenhum agente encontrado');
    return;
  }

  console.log('\n📋 Agentes ativos:');
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const status = data.event === 'start' ? '🟢' : '🔴';
    console.log(`   ${status} ${data.agentName || data.agentId} - ${data.event}`);
  });
}

function showMenu() {
  console.log('\n═══════════════════════════════════════');
  console.log('       🎮 Testes Interativos');
  console.log('═══════════════════════════════════════');
  console.log('\nAgentes:');
  Object.entries(AGENTS).forEach(([key, agent]) => {
    console.log(`  ${key}. ${agent.name}`);
  });
  console.log('\nAções:');
  console.log('  s - START (iniciar agente)');
  console.log('  e - END (finalizar agente)');
  console.log('  t - Definir TASK (tarefa)');
  console.log('  p - Definir PROGRESS (0-100)');
  console.log('  l - LISTAR agentes ativos');
  console.log('  c - CLEAR (limpar todos)');
  console.log('  q - QUIT (sair)');
  console.log('───────────────────────────────────────');
}

async function main() {
  console.log('\n🤖 Simulador Interativo - Fhinck Dashboard');
  console.log('📦 Projeto:', PROJECT_ID);
  console.log('📂 Estrutura: project/' + PROJECT_ID + '/agents/{agentId}');

  let currentTask = 'Implementando nova funcionalidade';
  let currentProgress = 0;

  showMenu();

  while (true) {
    const input = await question('\n> Comando (ex: 1s, 2e, t, p, l, c, q): ');
    const cmd = input.trim().toLowerCase();

    if (cmd === 'q' || cmd === 'quit' || cmd === 'exit') {
      console.log('\n👋 Até logo!\n');
      break;
    }

    if (cmd === 'l' || cmd === 'list') {
      await listAgents();
      continue;
    }

    if (cmd === 'c' || cmd === 'clear') {
      await clearAll();
      continue;
    }

    if (cmd === 't' || cmd === 'task') {
      currentTask = await question('   Nova tarefa: ');
      console.log(`   📝 Tarefa definida: "${currentTask}"`);
      continue;
    }

    if (cmd === 'p' || cmd === 'progress') {
      const p = await question('   Progresso (0-100): ');
      currentProgress = Math.max(0, Math.min(100, parseInt(p) || 0));
      console.log(`   📊 Progresso definido: ${currentProgress}%`);
      continue;
    }

    if (cmd === 'h' || cmd === 'help' || cmd === '?') {
      showMenu();
      continue;
    }

    // Parse comando de agente (ex: 1s, 2e)
    const match = cmd.match(/^(\d)([se])$/);
    if (match) {
      const agentKey = match[1];
      const action = match[2];
      const agent = AGENTS[agentKey];

      if (!agent) {
        console.log('❌ Agente não encontrado. Use 1-6.');
        continue;
      }

      const event = action === 's' ? 'start' : 'end';
      const task = event === 'start' ? currentTask : '';
      const progress = event === 'start' ? currentProgress : null;

      try {
        await sendEvent(agent.id, agent.name, agent.color, event, task, progress);
      } catch (err) {
        console.error('❌ Erro:', err.message);
      }
      continue;
    }

    console.log('❓ Comando não reconhecido. Digite "h" para ajuda.');
  }

  rl.close();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
