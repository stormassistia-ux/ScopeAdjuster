"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runIngestionJob = runIngestionJob;
exports.runComparisonJob = runComparisonJob;
const dotenv_1 = __importDefault(require("dotenv"));
const diffEngine_1 = require("./diffEngine");
dotenv_1.default.config();
console.log('Worker service starting up...');
// In a real implementation, this would connect to a queue (e.g. AWS SQS, Google Cloud Tasks, or BullMQ on Redis)
// For MVP, we stub an interval to simulate pulling tasks
setInterval(() => {
    // console.log('[Worker] Checking for new jobs...');
}, 10000);
// Stub functions that represent worker tasks
async function runIngestionJob(fileId) {
    console.log(`[Worker] Started ingestion job for ${fileId}`);
    // 1. Fetch file from object storage
    // 2. Extract text/structure using AI gateway or native libraries
    // 3. Write structured canonical rows to Postgres
    console.log(`[Worker] Finished ingestion job for ${fileId}`);
}
async function runComparisonJob(estimateAId, estimateBId) {
    console.log(`[Worker] Started comparison job for ${estimateAId} vs ${estimateBId}`);
    // 1. Fetch from DB (stubbed here)
    const itemsA = [
        { id: '1', description: 'Roof repair', qty: 1, unitPrice: 500, totalPrice: 500 }
    ];
    const itemsB = [
        { id: '1', description: 'Roof repair', qty: 1, unitPrice: 550, totalPrice: 550 },
        { id: '2', description: 'Paint', qty: 2, unitPrice: 100, totalPrice: 200 }
    ];
    // 1. Compute diffs deterministically
    const diffResult = (0, diffEngine_1.computeDeterministicDiff)(itemsA, itemsB);
    console.log('[Worker] Deterministic Diff Result:', JSON.stringify(diffResult, null, 2));
    // 2. Generate natural language summary via AI Gateway
    // 3. Save diff report to Postgres
    console.log(`[Worker] Finished comparison job for ${estimateAId} vs ${estimateBId}`);
}
//# sourceMappingURL=worker.js.map