/**
 * Task Manager Module
 * Gerencia a barra de tarefa principal e o histórico de atividades dos agentes
 */

// Estado do módulo
let mainTask = null;
let taskProgress = 0;
let agentHistories = new Map(); // Map<agentId, Array<HistoryItem>>
let isInitialized = false;

// DOM References
let taskBar = null;
let mainTaskText = null;
let progressLabel = null;
let progressBarFill = null;
let historySidebar = null;
let historyContent = null;
let historyEmpty = null;

// Configuração
const MAX_HISTORY_ITEMS_PER_AGENT = 10;

/**
 * Inicializa o módulo de gerenciamento de tarefas
 */
export function initTaskManager() {
  // Cache DOM elements
  taskBar = document.getElementById('task-bar');
  mainTaskText = document.getElementById('main-task-text');
  progressLabel = document.getElementById('progress-label');
  progressBarFill = document.getElementById('progress-bar-fill');
  historySidebar = document.getElementById('history-sidebar');
  historyContent = document.getElementById('history-content');
  historyEmpty = document.getElementById('history-empty');

  isInitialized = true;
  console.log('📋 Task Manager initialized');
}

/**
 * Mostra a barra de tarefa e sidebar de histórico
 */
export function showTaskBar() {
  if (taskBar) taskBar.classList.add('visible');
  if (historySidebar) historySidebar.classList.add('visible');
}

/**
 * Esconde a barra de tarefa e sidebar de histórico
 */
export function hideTaskBar() {
  if (taskBar) taskBar.classList.remove('visible');
  if (historySidebar) historySidebar.classList.remove('visible');
}

/**
 * Define a tarefa principal do time
 * @param {string} task - Descrição da tarefa principal
 * @param {number} progress - Progresso (0-100)
 */
export function setMainTask(task, progress = 0) {
  mainTask = task;
  taskProgress = Math.max(0, Math.min(100, progress));

  if (mainTaskText) {
    // Extrai título resumido da tarefa
    const summary = extractTaskSummary(task);
    mainTaskText.textContent = summary;
    mainTaskText.title = task; // Tooltip com tarefa completa
  }

  updateProgress(taskProgress);
}

/**
 * Atualiza o progresso da tarefa principal
 * @param {number} progress - Progresso (0-100)
 */
export function updateProgress(progress) {
  taskProgress = Math.max(0, Math.min(100, progress));

  if (progressLabel) {
    progressLabel.textContent = `${Math.round(taskProgress)}%`;
  }

  if (progressBarFill) {
    progressBarFill.style.width = `${taskProgress}%`;
  }
}

/**
 * Extrai um resumo da tarefa (primeira linha ou título)
 * @param {string} task - Tarefa completa
 * @returns {string} - Resumo da tarefa
 */
function extractTaskSummary(task) {
  if (!task) return 'Aguardando atividade...';

  // Se começa com #, pega o título do markdown
  const titleMatch = task.match(/^#\s+(.+?)(?:\n|$)/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // Pega a primeira linha não vazia
  const lines = task.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].replace(/^[#\-*]+\s*/, '').trim();
    // Limita o tamanho
    if (firstLine.length > 80) {
      return firstLine.substring(0, 77) + '...';
    }
    return firstLine;
  }

  return 'Processando...';
}

/**
 * Adiciona um item ao histórico de um agente
 * @param {Object} params - Parâmetros do histórico
 * @param {string} params.agentId - ID do agente
 * @param {string} params.agentName - Nome do agente
 * @param {string} params.agentColor - Cor do agente
 * @param {string} params.action - Ação realizada (read, write, execute, call, etc)
 * @param {string} params.detail - Detalhe da ação (nome do arquivo, comando, etc)
 * @param {string} params.status - Status do agente (working, idle)
 */
export function addHistoryItem({ agentId, agentName, agentColor, action, detail, status = 'working' }) {
  if (!agentHistories.has(agentId)) {
    agentHistories.set(agentId, {
      name: agentName,
      color: agentColor || '#FF6B35',
      status: status,
      items: []
    });
  }

  const agentData = agentHistories.get(agentId);
  agentData.status = status;
  agentData.name = agentName || agentData.name;
  agentData.color = agentColor || agentData.color;

  // Adiciona o novo item no início
  agentData.items.unshift({
    action,
    detail,
    timestamp: new Date()
  });

  // Limita o número de itens
  if (agentData.items.length > MAX_HISTORY_ITEMS_PER_AGENT) {
    agentData.items = agentData.items.slice(0, MAX_HISTORY_ITEMS_PER_AGENT);
  }

  // Re-renderiza o histórico
  renderHistory();
}

/**
 * Atualiza o status de um agente no histórico
 * @param {string} agentId - ID do agente
 * @param {string} status - Novo status (working, idle)
 */
export function updateAgentStatus(agentId, status) {
  if (agentHistories.has(agentId)) {
    agentHistories.get(agentId).status = status;
    renderHistory();
  }
}

/**
 * Limpa o histórico de todos os agentes
 */
export function clearHistory() {
  agentHistories.clear();
  renderHistory();
}

/**
 * Limpa o histórico de um agente específico
 * @param {string} agentId - ID do agente
 */
export function clearAgentHistory(agentId) {
  agentHistories.delete(agentId);
  renderHistory();
}

/**
 * Renderiza o histórico completo
 */
function renderHistory() {
  if (!historyContent) return;

  // Se não há histórico, mostra estado vazio
  if (agentHistories.size === 0) {
    if (historyEmpty) historyEmpty.classList.remove('hidden');
    // Remove grupos existentes
    const groups = historyContent.querySelectorAll('.history-agent-group');
    groups.forEach(g => g.remove());
    return;
  }

  // Esconde estado vazio
  if (historyEmpty) historyEmpty.classList.add('hidden');

  // Ordena agentes: working primeiro, depois por última atividade
  const sortedAgents = [...agentHistories.entries()].sort((a, b) => {
    // Working primeiro
    if (a[1].status === 'working' && b[1].status !== 'working') return -1;
    if (b[1].status === 'working' && a[1].status !== 'working') return 1;

    // Depois por última atividade
    const aTime = a[1].items[0]?.timestamp || 0;
    const bTime = b[1].items[0]?.timestamp || 0;
    return bTime - aTime;
  });

  // Atualiza ou cria grupos de agentes
  sortedAgents.forEach(([agentId, agentData]) => {
    let group = historyContent.querySelector(`[data-agent-id="${agentId}"]`);

    if (!group) {
      group = createAgentGroup(agentId, agentData);
      historyContent.appendChild(group);
    } else {
      updateAgentGroup(group, agentData);
    }
  });

  // Remove grupos de agentes que não existem mais
  const existingGroups = historyContent.querySelectorAll('.history-agent-group');
  existingGroups.forEach(group => {
    const agentId = group.dataset.agentId;
    if (!agentHistories.has(agentId)) {
      group.remove();
    }
  });

  // Reordena os grupos
  sortedAgents.forEach(([agentId]) => {
    const group = historyContent.querySelector(`[data-agent-id="${agentId}"]`);
    if (group) {
      historyContent.appendChild(group);
    }
  });
}

/**
 * Cria um grupo de histórico para um agente
 * @param {string} agentId - ID do agente
 * @param {Object} agentData - Dados do agente
 * @returns {HTMLElement} - Elemento do grupo
 */
function createAgentGroup(agentId, agentData) {
  const group = document.createElement('div');
  group.className = 'history-agent-group';
  group.dataset.agentId = agentId;

  // Iniciais do agente
  const initials = (agentData.name || 'AG')
    .split(/[-\s]/)
    .map(w => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  group.innerHTML = `
    <div class="history-agent-header">
      <div class="history-agent-avatar" style="background: ${agentData.color}">${initials}</div>
      <div class="history-agent-info">
        <div class="history-agent-name">${formatAgentName(agentData.name)}</div>
        <div class="history-agent-status ${agentData.status === 'working' ? 'working' : ''}">
          <span class="status-dot"></span>
          <span>${agentData.status === 'working' ? 'Trabalhando' : 'Aguardando'}</span>
        </div>
      </div>
    </div>
    <div class="history-items"></div>
  `;

  // Renderiza os itens
  const itemsContainer = group.querySelector('.history-items');
  renderHistoryItems(itemsContainer, agentData.items);

  return group;
}

/**
 * Atualiza um grupo de agente existente
 * @param {HTMLElement} group - Elemento do grupo
 * @param {Object} agentData - Dados atualizados do agente
 */
function updateAgentGroup(group, agentData) {
  // Atualiza status
  const statusEl = group.querySelector('.history-agent-status');
  if (statusEl) {
    statusEl.className = `history-agent-status ${agentData.status === 'working' ? 'working' : ''}`;
    statusEl.querySelector('span:last-child').textContent =
      agentData.status === 'working' ? 'Trabalhando' : 'Aguardando';
  }

  // Atualiza itens
  const itemsContainer = group.querySelector('.history-items');
  if (itemsContainer) {
    renderHistoryItems(itemsContainer, agentData.items);
  }
}

/**
 * Renderiza os itens de histórico
 * @param {HTMLElement} container - Container dos itens
 * @param {Array} items - Array de itens
 */
function renderHistoryItems(container, items) {
  container.innerHTML = items.map(item => `
    <div class="history-item">
      <div class="history-item-icon ${getActionType(item.action)}">
        ${getActionIcon(item.action)}
      </div>
      <div class="history-item-content">
        <div class="history-item-action">${formatAction(item.action)}</div>
        <div class="history-item-detail" title="${item.detail || ''}">${item.detail || ''}</div>
      </div>
      <div class="history-item-time">${formatTime(item.timestamp)}</div>
    </div>
  `).join('');
}

/**
 * Obtém o tipo de ação para estilização
 * @param {string} action - Ação
 * @returns {string} - Tipo (read, write, execute, call)
 */
function getActionType(action) {
  const actionLower = (action || '').toLowerCase();

  if (actionLower.includes('read') || actionLower.includes('lendo') || actionLower.includes('analis')) {
    return 'read';
  }
  if (actionLower.includes('write') || actionLower.includes('cria') || actionLower.includes('escrev') || actionLower.includes('edit')) {
    return 'write';
  }
  if (actionLower.includes('exec') || actionLower.includes('run') || actionLower.includes('test') || actionLower.includes('build')) {
    return 'execute';
  }
  if (actionLower.includes('call') || actionLower.includes('chama') || actionLower.includes('invoc')) {
    return 'call';
  }

  return 'read';
}

/**
 * Obtém o ícone para uma ação
 * @param {string} action - Ação
 * @returns {string} - SVG do ícone
 */
function getActionIcon(action) {
  const type = getActionType(action);

  const icons = {
    read: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>`,
    write: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`,
    execute: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="4 17 10 11 4 5"/>
      <line x1="12" y1="19" x2="20" y2="19"/>
    </svg>`,
    call: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
    </svg>`
  };

  return icons[type] || icons.read;
}

/**
 * Formata a ação para exibição
 * @param {string} action - Ação
 * @returns {string} - Ação formatada
 */
function formatAction(action) {
  if (!action) return 'Processando';

  // Capitaliza primeira letra
  return action.charAt(0).toUpperCase() + action.slice(1);
}

/**
 * Formata o nome do agente para exibição
 * @param {string} name - Nome do agente
 * @returns {string} - Nome formatado
 */
function formatAgentName(name) {
  if (!name) return 'Agente';

  // Remove prefixos comuns e formata
  return name
    .replace(/^fhinck[-_]/i, '')
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formata timestamp para exibição relativa
 * @param {Date} timestamp - Timestamp
 * @returns {string} - Tempo formatado
 */
function formatTime(timestamp) {
  if (!timestamp) return '';

  const now = new Date();
  const diff = now - new Date(timestamp);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 10) return 'agora';
  if (seconds < 60) return `${seconds}s`;
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;

  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
}

/**
 * Processa um evento de agente e adiciona ao histórico
 * @param {Object} params - Dados do evento
 * @param {string} params.agentId - ID do agente
 * @param {string} params.agentName - Nome do agente
 * @param {string} params.agentColor - Cor do agente
 * @param {string} params.event - Tipo de evento (start, end, tool_use, etc)
 * @param {string} params.task - Descrição da tarefa (legacy)
 * @param {string} params.prompt - Prompt/tarefa principal (barra roxa)
 * @param {string} params.action - Ação atual sendo feita
 * @param {string} params.actionDetail - Detalhe da ação
 * @param {Object} params.toolData - Dados da ferramenta usada (opcional)
 */
export function processAgentEvent({ agentId, agentName, agentColor, event, task, prompt, action: agentAction, actionDetail, toolData }) {
  const status = event === 'start' ? 'working' : (event === 'end' ? 'idle' : 'working');

  let action = '';
  let detail = '';

  switch (event) {
    case 'start':
      // Usa o campo 'action' do Firestore se disponível, senão fallback
      action = agentAction || 'Iniciando tarefa';
      detail = actionDetail || extractTaskSummary(task);

      // Atualiza a barra roxa com o campo 'prompt' (tarefa principal do time)
      if (prompt) {
        setMainTask(prompt, 10);
      }
      break;

    case 'end':
      action = 'Tarefa concluída';
      detail = '';
      break;

    case 'tool_use':
      if (toolData) {
        action = formatToolAction(toolData.tool);
        detail = toolData.input || '';
      } else {
        action = 'Usando ferramenta';
        detail = '';
      }
      break;

    default:
      action = agentAction || event;
      detail = actionDetail || (task ? extractTaskSummary(task) : '');
  }

  addHistoryItem({
    agentId,
    agentName,
    agentColor,
    action,
    detail,
    status
  });

  // Atualiza progresso baseado na atividade dos agentes
  updateProgressFromAgentActivity();
}

/**
 * Atualiza o progresso baseado na atividade dos agentes
 * Calcula progresso baseado em quantos agentes completaram tarefas
 */
function updateProgressFromAgentActivity() {
  if (agentHistories.size === 0) return;

  // Conta agentes trabalhando e inativos
  let workingCount = 0;
  let idleCount = 0;
  let totalTasks = 0;
  let completedTasks = 0;

  agentHistories.forEach((agentData) => {
    if (agentData.status === 'working') {
      workingCount++;
    } else {
      idleCount++;
    }

    // Conta tarefas iniciadas e concluídas
    agentData.items.forEach(item => {
      if (item.action === 'Iniciando tarefa') totalTasks++;
      if (item.action === 'Tarefa concluída') completedTasks++;
    });
  });

  // Calcula progresso
  // Se há tarefas, usa proporção de concluídas
  // Caso contrário, usa proporção de agentes inativos
  let progress = 0;
  if (totalTasks > 0) {
    progress = Math.round((completedTasks / totalTasks) * 100);
  } else if (agentHistories.size > 0) {
    progress = Math.round((idleCount / agentHistories.size) * 100);
  }

  // Se todos os agentes estão inativos e houve atividade, considera 100%
  if (workingCount === 0 && completedTasks > 0) {
    progress = 100;
  }

  // Se há agentes trabalhando, nunca mostra 100%
  if (workingCount > 0 && progress >= 100) {
    progress = 90;
  }

  updateProgress(progress);
}

/**
 * Formata a ação de uma ferramenta
 * @param {string} tool - Nome da ferramenta
 * @returns {string} - Ação formatada
 */
function formatToolAction(tool) {
  const toolActions = {
    'Read': 'Lendo arquivo',
    'Write': 'Escrevendo arquivo',
    'Edit': 'Editando arquivo',
    'Bash': 'Executando comando',
    'Grep': 'Buscando no código',
    'Glob': 'Buscando arquivos',
    'Task': 'Chamando sub-agente',
    'WebFetch': 'Buscando na web',
    'WebSearch': 'Pesquisando na web'
  };

  return toolActions[tool] || `Usando ${tool}`;
}

/**
 * Retorna o estado atual do gerenciador de tarefas
 */
export function getTaskManagerState() {
  return {
    mainTask,
    taskProgress,
    agentHistories: Object.fromEntries(agentHistories),
    isInitialized
  };
}
