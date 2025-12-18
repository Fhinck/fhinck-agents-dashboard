/**
 * Check current agent status
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkStatus() {
  console.log('📊 Current agent status:\n');

  const projectsRef = collection(db, 'project');
  const projectsSnapshot = await getDocs(projectsRef);

  for (const projectDoc of projectsSnapshot.docs) {
    const projectId = projectDoc.id;
    console.log(`📁 Project: ${projectId}`);

    const agentsRef = collection(db, 'project', projectId, 'agents');
    const agentsSnapshot = await getDocs(agentsRef);

    agentsSnapshot.forEach(agentDoc => {
      const agent = agentDoc.data();
      const statusEmoji = agent.status === 'working' ? '🔴' : '⚪';
      console.log(`   ${statusEmoji} ${agentDoc.id}: status="${agent.status}"`);
    });
    console.log('');
  }

  process.exit(0);
}

checkStatus();
