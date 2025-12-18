/**
 * Test Workflow - Simulates orchestrator delegating tasks
 *
 * Flow:
 * 1. fhinck-master-protocol -> working (orchestrating)
 * 2. Explore -> working (searching)
 * 3. fhinck-master-protocol -> working (processing results)
 * 4. base-specialist -> working (implementing)
 * 5. fhinck-master-protocol -> working (reviewing)
 * 6. fhinck-master-protocol -> idle (done)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCXefYE6rznPF74xG6O87akcpGwTdbgSfI",
  authDomain: "fhinck-agents-dashboard.firebaseapp.com",
  projectId: "fhinck-agents-dashboard",
  storageBucket: "fhinck-agents-dashboard.firebasestorage.app",
  messagingSenderId: "860308721950",
  appId: "1:860308721950:web:1bab595d8ba67eb905790f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PROJECT_ID = 'fhinck-api';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setAgentStatus(agentId, status, task = null) {
  const agentRef = doc(db, 'project', PROJECT_ID, 'agents', agentId);
  await updateDoc(agentRef, {
    status,
    currentTask: task,
    updatedAt: serverTimestamp()
  });
}

async function runWorkflow() {
  console.log('🎬 Iniciando workflow de teste...\n');
  console.log('📁 Projeto: fhinck-api');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Master starts orchestrating
    console.log('1️⃣  fhinck-master-protocol → WORKING');
    console.log('   📋 "Analisando requisitos do usuário..."\n');
    await setAgentStatus('fhinck-master-protocol', 'working', 'Analisando requisitos do usuário...');
    await sleep(5000);

    // Step 2: Master delegates to Explore
    console.log('2️⃣  fhinck-master-protocol → IDLE');
    await setAgentStatus('fhinck-master-protocol', 'idle', null);
    await sleep(500);

    console.log('   Explore → WORKING');
    console.log('   📋 "Buscando arquivos relevantes no codebase..."\n');
    await setAgentStatus('Explore', 'working', 'Buscando arquivos relevantes no codebase...');
    await sleep(6000);

    // Step 3: Explore done, Master processes
    console.log('3️⃣  Explore → IDLE');
    await setAgentStatus('Explore', 'idle', null);
    await sleep(500);

    console.log('   fhinck-master-protocol → WORKING');
    console.log('   📋 "Processando resultados da busca..."\n');
    await setAgentStatus('fhinck-master-protocol', 'working', 'Processando resultados da busca...');
    await sleep(4000);

    // Step 4: Master delegates to base-specialist
    console.log('4️⃣  fhinck-master-protocol → IDLE');
    await setAgentStatus('fhinck-master-protocol', 'idle', null);
    await sleep(500);

    console.log('   base-specialist → WORKING');
    console.log('   📋 "Implementando mudanças no código..."\n');
    await setAgentStatus('base-specialist', 'working', 'Implementando mudanças no código...');
    await sleep(6000);

    // Step 5: base-specialist done, Master reviews
    console.log('5️⃣  base-specialist → IDLE');
    await setAgentStatus('base-specialist', 'idle', null);
    await sleep(500);

    console.log('   fhinck-master-protocol → WORKING');
    console.log('   📋 "Revisando implementação e finalizando..."\n');
    await setAgentStatus('fhinck-master-protocol', 'working', 'Revisando implementação e finalizando...');
    await sleep(5000);

    // Step 6: Done - all idle
    console.log('6️⃣  fhinck-master-protocol → IDLE');
    console.log('   ✅ Workflow completo!\n');
    await setAgentStatus('fhinck-master-protocol', 'idle', null);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏁 Teste finalizado!');
    console.log('   Todos os agentes estão em estado idle.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

// Run
runWorkflow();
