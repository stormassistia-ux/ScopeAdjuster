import { runComparisonJob, runIngestionJob } from './worker';

async function simulateWorkerEnvironment() {
  console.log("==========================================");
  console.log("🛠️  STARTING ASYNC WORKER TEST ENVIRONMENT");
  console.log("==========================================\n");

  // Simulate Job 1: Ingestion
  console.log(">>> Sending Job 1: Ingest Estimate PDF");
  await runIngestionJob("upload_alpha_778");
  console.log("\n------------------------------------------\n");

  // Simulate Job 2: Comparison (Diff Engine)
  console.log(">>> Sending Job 2: Compute Deterministic Diff (Estimate A vs Estimate B)");
  await runComparisonJob("est_A_baseline", "est_B_revised");
  console.log("\n==========================================");
  console.log("✅ TEST ENVIRONMENT EXECUTION COMPLETE");
  console.log("==========================================");
}

// Execute the test script
simulateWorkerEnvironment().catch(console.error);
