import http from 'k6/http'
import { check, sleep, group, fail } from 'k6'
import { Counter, Rate, Trend } from 'k6/metrics'
import { BASE_URL } from './config.js'

// Custom metrics
const loginSuccess = new Counter('login_success')
const loginFailure = new Counter('login_failure')
const authRequests = new Counter('authenticated_requests')
const errorRate = new Rate('user_flow_errors')
const loginDuration = new Trend('login_duration')

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.05'],        // Error rate below 5%
    http_req_duration: ['p(95)<1000'],      // 95% under 1s
    'http_req_duration{name:login}': ['p(95)<2000'], // Login can be slower
    user_flow_errors: ['rate<0.1'],         // User flow errors below 10%
  },
}

// Test credentials - set via environment variables or use defaults
const TEST_EMAIL = __ENV.TEST_EMAIL || 'loadtest@example.com'
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'loadtest123'

export function setup() {
  // Verify the API is reachable before starting
  const healthRes = http.get(`${BASE_URL}/health`)
  if (healthRes.status !== 200) {
    fail(`API not reachable at ${BASE_URL}`)
  }
  console.log(`Starting user flow test against ${BASE_URL}`)
  console.log(`Using test account: ${TEST_EMAIL}`)
  return { baseUrl: BASE_URL }
}

export default function (data) {
  let token = null
  let userId = null

  // ============== AUTHENTICATION PHASE ==============
  group('1. Authentication', () => {
    const startLogin = Date.now()

    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'login' },
      }
    )

    loginDuration.add(Date.now() - startLogin)

    const loginOk = check(loginRes, {
      'login returns 200': (r) => r.status === 200,
      'login returns success': (r) => {
        try {
          return JSON.parse(r.body).success === true
        } catch {
          return false
        }
      },
      'login returns token': (r) => {
        try {
          const body = JSON.parse(r.body)
          if (body.data?.accessToken) {
            token = body.data.accessToken
            return true
          }
          return false
        } catch {
          return false
        }
      },
      'login returns user': (r) => {
        try {
          const body = JSON.parse(r.body)
          if (body.data?.user?.id) {
            userId = body.data.user.id
            return true
          }
          return false
        } catch {
          return false
        }
      },
    })

    if (loginOk) {
      loginSuccess.add(1)
    } else {
      loginFailure.add(1)
      errorRate.add(1)
      console.log(`Login failed: ${loginRes.status} - ${loginRes.body}`)
    }
  })

  // Skip remaining tests if login failed
  if (!token) {
    sleep(2)
    return
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }

  // ============== PROFILE PHASE ==============
  group('2. User Profile', () => {
    const profileRes = http.get(`${BASE_URL}/api/auth/me`, {
      headers: authHeaders,
      tags: { name: 'profile' },
    })
    authRequests.add(1)

    const profileOk = check(profileRes, {
      'profile returns 200': (r) => r.status === 200,
      'profile returns user data': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.success && body.data?.user
        } catch {
          return false
        }
      },
    })
    if (!profileOk) errorRate.add(1)

    sleep(0.5)
  })

  // ============== TEAMS PHASE ==============
  group('3. My Teams', () => {
    const teamsRes = http.get(`${BASE_URL}/api/teams/my-teams`, {
      headers: authHeaders,
      tags: { name: 'my_teams' },
    })
    authRequests.add(1)

    const teamsOk = check(teamsRes, {
      'my-teams returns 200': (r) => r.status === 200,
      'my-teams returns array': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.success && Array.isArray(body.data)
        } catch {
          return false
        }
      },
    })
    if (!teamsOk) errorRate.add(1)

    sleep(0.5)
  })

  // ============== BROWSE PLAYERS PHASE ==============
  group('4. Browse Players', () => {
    // Page 1
    const players1Res = http.get(`${BASE_URL}/api/players?page=1&limit=20`, {
      tags: { name: 'players_p1' },
    })
    check(players1Res, {
      'players page 1 returns 200': (r) => r.status === 200,
    }) || errorRate.add(1)

    sleep(0.3)

    // Page 2
    const players2Res = http.get(`${BASE_URL}/api/players?page=2&limit=20`, {
      tags: { name: 'players_p2' },
    })
    check(players2Res, {
      'players page 2 returns 200': (r) => r.status === 200,
    }) || errorRate.add(1)

    sleep(0.3)

    // Search
    const searchRes = http.get(`${BASE_URL}/api/players?search=Judge`, {
      tags: { name: 'players_search' },
    })
    check(searchRes, {
      'player search returns 200': (r) => r.status === 200,
    }) || errorRate.add(1)

    sleep(0.3)

    // Filter by team
    const teamRes = http.get(`${BASE_URL}/api/players?team=NYY`, {
      tags: { name: 'players_team' },
    })
    check(teamRes, {
      'team filter returns 200': (r) => r.status === 200,
    }) || errorRate.add(1)
  })

  // ============== LEADERBOARD PHASE ==============
  group('5. View Leaderboard', () => {
    const leaderboardRes = http.get(`${BASE_URL}/api/leaderboards/overall`, {
      tags: { name: 'leaderboard' },
    })
    check(leaderboardRes, {
      'leaderboard returns 200': (r) => r.status === 200,
    }) || errorRate.add(1)

    sleep(0.5)
  })

  // ============== SEASON INFO PHASE ==============
  group('6. Season Info', () => {
    const seasonRes = http.get(`${BASE_URL}/api/season/current`, {
      tags: { name: 'season' },
    })
    check(seasonRes, {
      'season returns 200': (r) => r.status === 200,
    }) || errorRate.add(1)
  })

  // Simulate user thinking/reading time
  sleep(2)
}

export function teardown(data) {
  console.log('\n=== User Flow Test Complete ===')
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: BASE_URL,
      testEmail: TEST_EMAIL,
    },
    results: {
      totalRequests: data.metrics.http_reqs?.values?.count || 0,
      iterations: data.metrics.iterations?.values?.count || 0,
      loginSuccess: data.metrics.login_success?.values?.count || 0,
      loginFailure: data.metrics.login_failure?.values?.count || 0,
      authRequests: data.metrics.authenticated_requests?.values?.count || 0,
      avgDuration: data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0,
      p95Duration: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
      errorRate: ((data.metrics.user_flow_errors?.values?.rate || 0) * 100).toFixed(2),
    },
  }

  console.log('\n========== USER FLOW TEST RESULTS ==========')
  console.log(`Timestamp: ${summary.timestamp}`)
  console.log(`Base URL: ${summary.config.baseUrl}`)
  console.log(`Iterations: ${summary.results.iterations}`)
  console.log(`Login Success: ${summary.results.loginSuccess}`)
  console.log(`Login Failures: ${summary.results.loginFailure}`)
  console.log(`Authenticated Requests: ${summary.results.authRequests}`)
  console.log(`Average Response: ${summary.results.avgDuration}ms`)
  console.log(`95th Percentile: ${summary.results.p95Duration}ms`)
  console.log(`Error Rate: ${summary.results.errorRate}%`)
  console.log('=============================================\n')

  return {
    'stdout': JSON.stringify(summary, null, 2),
  }
}
