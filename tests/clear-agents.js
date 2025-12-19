/**
 * Script para limpar todos os agentes do Firestore
 * Útil quando algum agente fica preso em estado "working"
 *
 * Usa a API REST do Firestore com autenticação do Firebase CLI
 *
 * Uso:
 *   node tests/clear-agents.js                     # Limpa todos os projetos
 *   node tests/clear-agents.js fhinck-api          # Limpa projeto específico
 *   node tests/clear-agents.js --reset             # Reseta agentes para idle
 */

import { execSync } from 'child_process';

const FIREBASE_PROJECT = 'fhinck-agents-dashboard';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

// Parse argumentos
const args = process.argv.slice(2);
const resetMode = args.includes('--reset');
const projectArg = args.find(a => !a.startsWith('--'));

function getAccessToken() {
  try {
    // Tenta usar o token do Firebase CLI
    const token = execSync('npx firebase-tools login:ci --no-localhost 2>/dev/null || gcloud auth print-access-token', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return token;
  } catch {
    try {
      // Fallback para gcloud
      const token = execSync('gcloud auth print-access-token', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      return token;
    } catch {
      return null;
    }
  }
}

async function fetchWithAuth(url, options = {}) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Não foi possível obter token de autenticação. Execute: gcloud auth login');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

async function getAllProjects() {
  try {
    const data = await fetchWithAuth(`${FIRESTORE_BASE_URL}/project`);
    if (!data.documents) return [];
    return data.documents.map(doc => doc.name.split('/').pop());
  } catch (err) {
    if (err.message.includes('404')) return [];
    throw err;
  }
}

async function getAgentsFromProject(projectId) {
  try {
    const data = await fetchWithAuth(`${FIRESTORE_BASE_URL}/project/${projectId}/agents`);
    if (!data.documents) return [];
    return data.documents;
  } catch (err) {
    if (err.message.includes('404')) return [];
    throw err;
  }
}

async function deleteAgent(docPath) {
  const docName = docPath.split('/documents/')[1] || docPath;
  await fetchWithAuth(`${FIRESTORE_BASE_URL}/${docName}`, {
    method: 'DELETE'
  });
}

async function resetAgent(docPath) {
  const docName = docPath.split('/documents/')[1] || docPath;
  await fetchWithAuth(`${FIRESTORE_BASE_URL}/${docName}?updateMask.fieldPaths=status&updateMask.fieldPaths=currentTask`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        status: { stringValue: 'idle' },
        currentTask: { stringValue: '' }
      }
    })
  });
}

async function clearAgentsFromProject(projectId) {
  const agents = await getAgentsFromProject(projectId);

  if (agents.length === 0) {
    console.log(`   📂 ${projectId}: Nenhum agente encontrado`);
    return 0;
  }

  for (const agent of agents) {
    const agentId = agent.name.split('/').pop();
    if (resetMode) {
      await resetAgent(agent.name);
      console.log(`      ↻ ${agentId} → idle`);
    } else {
      await deleteAgent(agent.name);
      console.log(`      ✗ ${agentId} removido`);
    }
  }

  console.log(`   📂 ${projectId}: ${agents.length} agentes ${resetMode ? 'resetados' : 'removidos'}`);
  return agents.length;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('     🧹 Limpeza de Agentes - Fhinck Dashboard');
  console.log('═══════════════════════════════════════════════════\n');

  const mode = resetMode ? 'RESET (idle)' : 'DELETE';
  console.log(`⚡ Modo: ${mode}\n`);

  let totalAgents = 0;

  if (projectArg) {
    console.log(`🎯 Projeto específico: ${projectArg}\n`);
    totalAgents = await clearAgentsFromProject(projectArg);
  } else {
    console.log('🔍 Buscando todos os projetos...\n');

    const projects = await getAllProjects();

    if (projects.length === 0) {
      console.log('   Nenhum projeto encontrado.');
    } else {
      console.log(`   Encontrados ${projects.length} projetos:\n`);

      for (const projectId of projects) {
        const count = await clearAgentsFromProject(projectId);
        totalAgents += count;
      }
    }
  }

  console.log('\n───────────────────────────────────────────────────');
  console.log(`✅ Total: ${totalAgents} agentes ${resetMode ? 'resetados' : 'removidos'}`);
  console.log('───────────────────────────────────────────────────\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  console.log('\n💡 Dica: Execute "gcloud auth login" para autenticar\n');
  process.exit(1);
});
