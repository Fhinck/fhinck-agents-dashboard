/**
 * Fix Agent Status and Test Real-time Updates
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCXefYE6rznPF74xG6O87akcpGwTdbgSfI",
  authDomain: "fhinck-agents-dashboard.firebaseapp.com",
  projectId: "fhinck-agents-dashboard",
  storageBucket: "fhinck-agents-dashboard.firebasestorage.app",
  messagingSenderId: "860308721950",
  appId: "1:860308721950:web:1bab595d8ba67eb905790f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixAndTest() {
  console.log('🔧 STEP 1: Fixing agents with undefined status...\n');

  try {
    const projectsRef = collection(db, 'project');
    const projectsSnapshot = await getDocs(projectsRef);

    let fixedCount = 0;

    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;
      const agentsRef = collection(db, 'project', projectId, 'agents');
      const agentsSnapshot = await getDocs(agentsRef);

      for (const agentDoc of agentsSnapshot.docs) {
        const agent = agentDoc.data();

        if (!agent.status || agent.status === 'undefined') {
          console.log(`   Fixing: ${projectId}/${agentDoc.id} - setting status to "idle"`);

          await updateDoc(doc(db, 'project', projectId, 'agents', agentDoc.id), {
            status: 'idle',
            updatedAt: serverTimestamp()
          });

          fixedCount++;
        }
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} agents\n`);

    // STEP 2: Test real-time updates
    console.log('🧪 STEP 2: Testing real-time updates...\n');
    console.log('   Using project: fhinck-api');
    console.log('   Using agent: Explore\n');

    const testAgentRef = doc(db, 'project', 'fhinck-api', 'agents', 'Explore');

    // Set to working
    console.log('⏳ [1/4] Setting status to "working"...');
    await updateDoc(testAgentRef, {
      status: 'working',
      currentTask: 'Teste de atualização em tempo real',
      updatedAt: serverTimestamp()
    });
    console.log('✅ Status = "working"');
    console.log('   👀 Verifique o dashboard - o agente deve focar e pulsar!\n');

    // Wait 8 seconds
    console.log('⏱️  Aguardando 8 segundos...\n');
    await sleep(8000);

    // Set back to idle
    console.log('⏳ [2/4] Setting status to "idle"...');
    await updateDoc(testAgentRef, {
      status: 'idle',
      currentTask: null,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Status = "idle"');
    console.log('   👀 O agente deve voltar ao normal!\n');

    // Wait 5 seconds
    console.log('⏱️  Aguardando 5 segundos...\n');
    await sleep(5000);

    // Test with another agent
    const testAgentRef2 = doc(db, 'project', 'fhinck-api', 'agents', 'investigator');

    console.log('⏳ [3/4] Testing another agent (investigator) -> "working"...');
    await updateDoc(testAgentRef2, {
      status: 'working',
      currentTask: 'Investigando problema de performance',
      updatedAt: serverTimestamp()
    });
    console.log('✅ investigator = "working"\n');

    await sleep(6000);

    console.log('⏳ [4/4] Setting investigator back to "idle"...');
    await updateDoc(testAgentRef2, {
      status: 'idle',
      currentTask: null,
      updatedAt: serverTimestamp()
    });
    console.log('✅ investigator = "idle"\n');

    console.log('🏁 Teste completo!');
    console.log('\n📋 Se as atualizações não aparecerem no dashboard:');
    console.log('   1. Verifique o console do browser (F12)');
    console.log('   2. Procure por logs "📡 Firestore snapshot received"');
    console.log('   3. Verifique se há erros de permissão');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

// Run
fixAndTest();
