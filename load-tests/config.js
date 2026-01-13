// k6 Load Testing Configuration
// Environment variable API_URL can override default

export const BASE_URL = __ENV.API_URL || 'http://localhost:5000'

// Performance thresholds
export const thresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
  http_req_failed: ['rate<0.01'],                  // Error rate < 1%
  http_reqs: ['rate>100'],                         // Throughput > 100 req/s
}

// Test stages for different load profiles
export const stages = {
  // Smoke test - light load, verify basics work
  smoke: [
    { duration: '1m', target: 5 },   // Ramp to 5 users
    { duration: '1m', target: 5 },   // Hold at 5 users
    { duration: '1m', target: 0 },   // Ramp down
  ],

  // Load test - normal expected load
  load: [
    { duration: '2m', target: 50 },  // Ramp to 50 users
    { duration: '5m', target: 50 },  // Hold at 50 users
    { duration: '2m', target: 0 },   // Ramp down
  ],

  // Stress test - find breaking point
  stress: [
    { duration: '2m', target: 100 },  // Ramp to 100 users
    { duration: '5m', target: 100 },  // Hold at 100 users
    { duration: '2m', target: 200 },  // Ramp to 200 users
    { duration: '5m', target: 200 },  // Hold at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],

  // Spike test - sudden traffic surge
  spike: [
    { duration: '1m', target: 10 },   // Normal load
    { duration: '30s', target: 200 }, // Spike!
    { duration: '1m', target: 200 },  // Hold spike
    { duration: '30s', target: 10 },  // Drop back
    { duration: '1m', target: 0 },    // Ramp down
  ],
}

// Common check functions
export function checkStatus200(response, name) {
  return response.status === 200
}

export function checkSuccess(response) {
  try {
    const body = JSON.parse(response.body)
    return body.success === true
  } catch {
    return false
  }
}

export function checkHasData(response) {
  try {
    const body = JSON.parse(response.body)
    return body.data !== undefined
  } catch {
    return false
  }
}
