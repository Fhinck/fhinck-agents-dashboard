/**
 * Notion Tasks Store
 * Fetches and manages tasks from Notion database
 *
 * Uses Firebase Cloud Function when available (requires Blaze plan),
 * falls back to CORS proxy for development/Spark plan.
 */

// API endpoint (Firebase Cloud Function via hosting rewrite)
const API_ENDPOINT = '/api/notion-tasks';

// Fallback: CORS proxy + direct Notion API (for Spark plan / development)
const NOTION_API_KEY = import.meta.env.VITE_NOTION_API_KEY;
const NOTION_DATABASE_ID = import.meta.env.VITE_NOTION_DATABASE_ID;
const NOTION_API_BASE = 'https://api.notion.com/v1';
const CORS_PROXY = 'https://corsproxy.io/?';

// Cache for tasks
let tasksCache = [];
let lastFetchTime = null;
const CACHE_TTL = 60000; // 1 minute cache
let useCloudFunction = true; // Will be set to false if cloud function is not available

// Status values to exclude (for client-side filtering)
const EXCLUDED_STATUSES = [
  'concluído',
  'concluido',
  'arquivado',
  'done',
  'completed',
  'archived',
  'cancelado',
  'cancelled'
];

/**
 * Fetch tasks from Notion database
 * Tries Cloud Function first, falls back to CORS proxy
 * @param {boolean} forceRefresh - Force refresh even if cache is valid
 * @returns {Promise<Array>} Array of tasks
 */
export async function fetchNotionTasks(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && tasksCache.length > 0 && lastFetchTime) {
    const now = Date.now();
    if (now - lastFetchTime < CACHE_TTL) {
      console.log('📋 Returning cached Notion tasks');
      return tasksCache;
    }
  }

  // Try Cloud Function first (if available)
  if (useCloudFunction) {
    try {
      const tasks = await fetchViaCloudFunction();
      return tasks;
    } catch (error) {
      console.warn('⚠️ Cloud Function not available, falling back to CORS proxy:', error.message);
      useCloudFunction = false;
    }
  }

  // Fallback to CORS proxy
  return fetchViaCorsProxy();
}

/**
 * Fetch tasks via Firebase Cloud Function
 */
async function fetchViaCloudFunction() {
  console.log('📋 Fetching tasks via Cloud Function...');

  const response = await fetch(API_ENDPOINT, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return processNotionResponse(data);
}

/**
 * Fetch tasks via CORS proxy (fallback)
 */
async function fetchViaCorsProxy() {
  console.log('📋 Fetching tasks via CORS proxy...');

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    throw new Error('Notion API credentials not configured');
  }

  // Build filter to exclude completed/archived tasks
  const filter = {
    and: EXCLUDED_STATUSES.map(status => ({
      property: 'Status',
      status: {
        does_not_equal: status
      }
    }))
  };

  // Build the request URL with CORS proxy
  const apiUrl = `${NOTION_API_BASE}/databases/${NOTION_DATABASE_ID}/query`;
  const fetchUrl = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`;

  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter,
      sorts: [
        {
          property: 'Data de início',
          direction: 'descending'
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Notion API error:', errorData);
    throw new Error(`Notion API error: ${response.status}`);
  }

  const data = await response.json();
  return processNotionResponse(data);
}

/**
 * Process Notion API response
 * @param {Object} data - Notion API response
 * @returns {Array} Processed tasks
 */
function processNotionResponse(data) {
  try {
    const tasks = data.results.map(parseNotionTask).filter(task => task !== null);

    // Filter out tasks with excluded statuses (fallback filter)
    const filteredTasks = tasks.filter(task => {
      const statusLower = (task.status || '').toLowerCase();
      return !EXCLUDED_STATUSES.some(excluded => statusLower.includes(excluded));
    });

    // Update cache
    tasksCache = filteredTasks;
    lastFetchTime = Date.now();

    console.log(`📋 Fetched ${filteredTasks.length} active tasks from Notion`);
    return filteredTasks;

  } catch (error) {
    console.error('❌ Error processing Notion response:', error);

    // Return cached data if available
    if (tasksCache.length > 0) {
      console.log('📋 Returning stale cached data');
      return tasksCache;
    }

    throw error;
  }
}

/**
 * Parse a Notion page into a task object
 * @param {Object} page - Notion page object
 * @returns {Object|null} Parsed task or null
 */
function parseNotionTask(page) {
  try {
    const props = page.properties;

    // Get task name (title property)
    const nameProperty = props['Nome da tarefa'] || props['Name'] || props['Título'] || props['Title'];
    const name = getNotionTitle(nameProperty);

    if (!name) return null;

    // Get priority
    const priorityProperty = props['Prioridade'] || props['Priority'];
    const priority = getNotionSelect(priorityProperty);

    // Get status
    const statusProperty = props['Status'];
    const status = getNotionStatus(statusProperty);

    // Get type
    const typeProperty = props['Tipo de tarefa'] || props['Tipo de t...'] || props['Type'];
    const type = getNotionMultiSelect(typeProperty);

    // Get deal
    const dealProperty = props['Deal'];
    const deal = getNotionRelation(dealProperty);

    // Get stakeholders
    const stakeholdersProperty = props['Stakeholders'] || props['Stakeholder'];
    const stakeholders = getNotionMultiSelect(stakeholdersProperty) || getNotionRelation(stakeholdersProperty);

    // Get dates
    const startDateProperty = props['Data de início'] || props['Start Date'];
    const startDate = getNotionDate(startDateProperty);

    const dueDateProperty = props['Data de'] || props['Due Date'] || props['Prazo'];
    const dueDate = getNotionDate(dueDateProperty);

    // Get deadline defined
    const deadlineProperty = props['Prazo definido'];
    const hasDeadline = getNotionCheckbox(deadlineProperty);

    return {
      id: page.id,
      name,
      priority,
      status,
      type,
      deal,
      stakeholders,
      startDate,
      dueDate,
      hasDeadline,
      url: page.url,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  } catch (error) {
    console.error('Error parsing Notion task:', error, page);
    return null;
  }
}

/**
 * Get title from Notion property
 */
function getNotionTitle(property) {
  if (!property || !property.title) return null;
  return property.title.map(t => t.plain_text).join('');
}

/**
 * Get select value from Notion property
 */
function getNotionSelect(property) {
  if (!property) return null;
  if (property.select) return property.select.name;
  return null;
}

/**
 * Get status value from Notion property
 */
function getNotionStatus(property) {
  if (!property) return null;
  if (property.status) return property.status.name;
  if (property.select) return property.select.name;
  return null;
}

/**
 * Get multi-select values from Notion property
 */
function getNotionMultiSelect(property) {
  if (!property || !property.multi_select) return null;
  const values = property.multi_select.map(s => s.name);
  return values.length > 0 ? values : null;
}

/**
 * Get relation values from Notion property
 */
function getNotionRelation(property) {
  if (!property || !property.relation) return null;
  return property.relation.length > 0 ? property.relation.map(r => r.id) : null;
}

/**
 * Get date from Notion property
 */
function getNotionDate(property) {
  if (!property || !property.date) return null;
  return property.date.start;
}

/**
 * Get checkbox value from Notion property
 */
function getNotionCheckbox(property) {
  if (!property) return false;
  return property.checkbox === true;
}

/**
 * Get cached tasks
 * @returns {Array} Cached tasks
 */
export function getTasks() {
  return tasksCache;
}

/**
 * Clear tasks cache
 */
export function clearTasksCache() {
  tasksCache = [];
  lastFetchTime = null;
}

/**
 * Get priority color
 * @param {string} priority - Priority value
 * @returns {string} Color hex code
 */
export function getPriorityColor(priority) {
  const priorityLower = (priority || '').toLowerCase();

  if (priorityLower === 'alta' || priorityLower === 'high') {
    return '#ef4444'; // Red
  }
  if (priorityLower === 'mit' || priorityLower === 'média' || priorityLower === 'medium') {
    return '#f59e0b'; // Orange/Yellow
  }
  if (priorityLower === 'baixa' || priorityLower === 'low') {
    return '#22c55e'; // Green
  }

  return '#6b7280'; // Gray default
}

/**
 * Get status color
 * @param {string} status - Status value
 * @returns {string} Color hex code
 */
export function getStatusColor(status) {
  const statusLower = (status || '').toLowerCase();

  if (statusLower.includes('andamento') || statusLower.includes('progress')) {
    return '#3b82f6'; // Blue
  }
  if (statusLower.includes('testes') || statusLower.includes('revisão') || statusLower.includes('review')) {
    return '#8b5cf6'; // Purple
  }
  if (statusLower.includes('backlog') || statusLower.includes('not')) {
    return '#6b7280'; // Gray
  }
  if (statusLower.includes('feature')) {
    return '#10b981'; // Emerald
  }

  return '#6b7280'; // Gray default
}
