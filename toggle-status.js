/**
 * Toggle Agent Status - Interactive Script
 * Usage: node toggle-status.js <projectId> <agentId> [working|idle]
 *
 * Examples:
 *   node toggle-status.js fhinck-api Explore working
 *   node toggle-status.js fhinck-api Explore idle
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

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

async function toggleStatus() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node toggle-status.js <projectId> <agentId> [working|idle]');
    console.log('');
    console.log('Examples:');
    console.log('  node toggle-status.js fhinck-api Explore working');
    console.log('  node toggle-status.js fhinck-api Explore idle');
    console.log('  node toggle-status.js fhinck-api Explore  (toggle current status)');
    process.exit(1);
  }

  const [projectId, agentId, newStatus] = args;
  const agentRef = doc(db, 'project', projectId, 'agents', agentId);

  try {
    // Get current status
    const agentDoc = await getDoc(agentRef);

    if (!agentDoc.exists()) {
      console.error(`❌ Agent not found: project/${projectId}/agents/${agentId}`);
      process.exit(1);
    }

    const currentStatus = agentDoc.data().status;
    let targetStatus = newStatus;

    // Toggle if no status specified
    if (!targetStatus) {
      targetStatus = currentStatus === 'working' ? 'idle' : 'working';
    }

    console.log(`📍 Agent: ${projectId}/${agentId}`);
    console.log(`   Current status: ${currentStatus}`);
    console.log(`   New status: ${targetStatus}`);
    console.log('');

    // Update status
    const updateData = {
      status: targetStatus,
      updatedAt: serverTimestamp()
    };

    if (targetStatus === 'working') {
      updateData.currentTask = 'Tarefa de teste manual';
    } else {
      updateData.currentTask = null;
    }

    await updateDoc(agentRef, updateData);
    console.log(`✅ Status updated to "${targetStatus}"`);
    console.log('   👀 Verifique o dashboard!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

toggleStatus();
