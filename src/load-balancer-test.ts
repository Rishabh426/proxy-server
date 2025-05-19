
import http from 'http';
import { performance } from 'perf_hooks';

const TOTAL_REQUESTS = 50;      
const CONCURRENCY = 10;          
const TARGET_URL = 'http://localhost:3000'; 
const PATHS = ['/comments', '/todos', '/users']; 

const workerDistribution: Record<string, number> = {};

function makeRequest(path: string): Promise<{ statusCode: number, workerId?: string }> {
  const startTime = performance.now();
  
  return new Promise((resolve, reject) => {
    const req = http.get(`${TARGET_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = performance.now() - startTime;
        const workerId = res.headers['x-worker-id'] as string || 'unknown';
        
        console.log(`✓ [${res.statusCode}] ${path} (${responseTime.toFixed(2)}ms) - Worker: ${workerId}`);
        resolve({
          statusCode: res.statusCode || 0,
          workerId
        });
      });
    });
    
    req.on('error', (error) => {
      console.error(`✗ Error on ${path}: ${error.message}`);
      reject(error);
    });
    
    req.end();
  });
}

async function loadTest() {
  console.log(`Starting load test - ${TOTAL_REQUESTS} requests, ${CONCURRENCY} concurrent`);
  
  let completedRequests = 0;
  let successfulRequests = 0;
  
  for (let i = 0; i < Math.ceil(TOTAL_REQUESTS / CONCURRENCY); i++) {
    const tasks: Promise<{ statusCode: number, workerId?: string }>[] = [];
    
    const batchSize = Math.min(CONCURRENCY, TOTAL_REQUESTS - (i * CONCURRENCY));
    
    for (let j = 0; j < batchSize; j++) {
      const requestIndex = i * CONCURRENCY + j;
      const path = PATHS[requestIndex % PATHS.length];
      tasks.push(makeRequest(path));
    }
    
    const results = await Promise.allSettled(tasks);
    
    results.forEach(result => {
      completedRequests++;
      
      if (result.status === 'fulfilled') {
        successfulRequests++;
        const { workerId = 'unknown' } = result.value;
        workerDistribution[workerId] = (workerDistribution[workerId] || 0) + 1;
      }
    });
    
    console.log(`Batch ${i + 1} complete - ${completedRequests}/${TOTAL_REQUESTS} requests processed`);
  }
  
  console.log('\n===== LOAD BALANCING REPORT =====');
  console.log(`Successful requests: ${successfulRequests}/${TOTAL_REQUESTS}`);
  
  const workers = Object.entries(workerDistribution).sort((a, b) => b[1] - a[1]);
  
  console.log('\nWorker Distribution:');
  workers.forEach(([workerId, count]) => {
    const percentage = ((count / successfulRequests) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(Number(percentage) / 5));
    console.log(`  Worker ${workerId}: ${count} requests (${percentage}%) ${bar}`);
  });
  
  if (workers.length <= 1) {
    console.log('\nWarning: Only one worker detected or worker IDs not tracked correctly');
    return;
  }
  
  const counts = workers.map(w => w[1]);
  const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);
  const relativeStdDev = (stdDev / mean) * 100;
  
  console.log(`\nDistribution analysis:`);
  console.log(`  Standard deviation: ${stdDev.toFixed(2)} (${relativeStdDev.toFixed(2)}% of mean)`);
  
  if (relativeStdDev < 10) {
    console.log('  Result: Good load balancing! Distribution is even.');
  } else if (relativeStdDev < 20) {
    console.log('  Result: Fair load balancing. Some imbalance detected.');
  } else {
    console.log('  Result: Poor load balancing. Distribution is very uneven.');
    console.log('  Tip: Verify connectionClosed messages are being sent correctly');
  }
}

loadTest()
  .then(() => console.log('Load test completed!'))
  .catch(err => console.error(`Test failed: ${err.message}`));