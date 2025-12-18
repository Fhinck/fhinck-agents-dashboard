/**
 * Test Script for Real-time Updates
 * Simulates agent status changes to verify Firestore listener
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createInterface } from 'readline';

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

async function testRealtimeUpdates() {
  console.log('🔍 Fetching projects and agents...\n');

  try {
    // 1. List all projects
    const projectsRef = collection(db, 'project');
    const projectsSnapshot = await getDocs(projectsRef);

    console.log(`📁 Found ${projectsSnapshot.size} projects:\n`);

    for (const projectDoc of projectsSnapshot.docs) {
      const projectId = projectDoc.id;
      const projectData = projectDoc.data();
      console.log(`   Project: ${projectId} | Name: ${projectData.projectName || projectId}`);

      // 2. List agents in each project
      const agentsRef = collection(db, 'project', projectId, 'agents');
      const agentsSnapshot = await getDocs(agentsRef);

      console.log(`      Agents (${agentsSnapshot.size}):`);
      agentsSnapshot.forEach(agentDoc => {
        const agent = agentDoc.data();
        console.log(`         - ${agentDoc.id}: status="${agent.status}" | name="${agent.agentName}"`);
      });
      console.log('');
    }

    // 3. Ask user which project and agent to test
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\n📌 Enter projectId to test: ', async (projectId) => {
      rl.question('📌 Enter agentId to test: ', async (agentId) => {
        console.log(`\n🚀 Testing real-time updates for project/${projectId}/agents/${agentId}\n`);

        const agentRef = doc(db, 'project', projectId, 'agents', agentId);

        try {
          // Step 1: Set to 'working'
          console.log('⏳ Setting status to "working"...');
          await updateDoc(agentRef, {
            status: 'working',
            currentTask: 'Testing real-time updates from script',
            updatedAt: serverTimestamp()
          });
          console.log('✅ Status set to "working"');
          console.log('   (Check the dashboard - agent should be focused with animation)\n');

          // Wait 10 seconds
          console.log('⏱️  Waiting 10 seconds before setting back to idle...\n');
          await new Promise(resolve => setTimeout(resolve, 10000));

          // Step 2: Set back to 'idle'
          console.log('⏳ Setting status to "idle"...');
          await updateDoc(agentRef, {
            status: 'idle',
            currentTask: null,
            updatedAt: serverTimestamp()
          });
          console.log('✅ Status set to "idle"');
          console.log('   (Check the dashboard - agent should unfocus)\n');

          console.log('🏁 Test complete! Check the dashboard console for listener logs.');
        } catch (error) {
          console.error('❌ Error updating agent:', error.message);
        }

        rl.close();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run
testRealtimeUpdates();
