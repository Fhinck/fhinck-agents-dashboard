/**
 * Firebase Cloud Functions for Fhinck Agents Dashboard
 * Provides a proxy for Notion API to avoid CORS issues
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const cors = require('cors')({ origin: true });

// Define parameters for Notion API (set via Firebase CLI or console)
const notionApiKey = defineString('NOTION_API_KEY');
const notionDatabaseId = defineString('NOTION_DATABASE_ID');

const NOTION_API_BASE = 'https://api.notion.com/v1';

// Status values to exclude (completed/archived)
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
 * Proxy function to fetch tasks from Notion
 * Handles CORS and authentication
 */
exports.getNotionTasks = onRequest(
  {
    cors: true,
    region: 'southamerica-east1'  // São Paulo region for lower latency
  },
  async (req, res) => {
    // Handle CORS preflight
    cors(req, res, async () => {
      try {
        // Only allow GET and POST
        if (req.method !== 'GET' && req.method !== 'POST') {
          res.status(405).json({ error: 'Method not allowed' });
          return;
        }

        const apiKey = notionApiKey.value();
        const databaseId = notionDatabaseId.value();

        if (!apiKey || !databaseId) {
          console.error('Missing Notion configuration');
          res.status(500).json({ error: 'Server configuration error' });
          return;
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

        // Query Notion database
        const notionResponse = await fetch(
          `${NOTION_API_BASE}/databases/${databaseId}/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
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
          }
        );

        if (!notionResponse.ok) {
          const errorData = await notionResponse.json();
          console.error('Notion API error:', errorData);
          res.status(notionResponse.status).json(errorData);
          return;
        }

        const data = await notionResponse.json();

        // Return the results
        res.status(200).json(data);

      } catch (error) {
        console.error('Error fetching Notion tasks:', error);
        res.status(500).json({
          error: 'Failed to fetch tasks',
          message: error.message
        });
      }
    });
  }
);

/**
 * Health check endpoint
 */
exports.health = onRequest(
  {
    cors: true,
    region: 'southamerica-east1'
  },
  (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  }
);
