/**
 * Firebase Configuration for Tests
 * Usa firebase-admin para acesso direto ao Firestore
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tenta carregar service account se existir
const serviceAccountPath = join(__dirname, 'service-account.json');

let db;

if (existsSync(serviceAccountPath)) {
  // Usa service account para autenticação completa
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }

  console.log('🔥 Firebase Admin initialized with service account');
} else {
  // Usa Application Default Credentials ou projeto padrão
  if (getApps().length === 0) {
    initializeApp({
      projectId: 'fhinck-agents-dashboard'
    });
  }

  console.log('🔥 Firebase Admin initialized (ADC mode)');
  console.log('💡 Dica: Para autenticação completa, adicione service-account.json na pasta tests/');
}

db = getFirestore();

export { db };
