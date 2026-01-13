import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Counter, Rate, Trend } from 'k6/metrics'
import { BASE_URL, thresholds, stages } from './config.js'

// Custom metrics
const playersRequests = new Counter('players_requests')
const searchRequests = new Counter('search_requests')
const leaderboardRequests = new Counter('leaderboard_requests')
const errorRate = new Rate('errors')
const playersDuration = new Trend('players_duration')
const leaderboardDuration = new Trend('leaderboard_duration')

export const options = {
  stages: stages.load,
  thresholds: {
    ...thresholds,
    'http_req_duration{name:players}': ['p(95)<800'],
    'http_req_duration{name:leaderboard}': ['p(95)<1000'],
    'http_req_duration{name:search}': ['p(95)<600'],
    errors: ['rate<0.05'], // Error rate below 5%
  },
}

export default function () {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`, {
      tags: { name: 'health' },
    })
    check(res, {
      'health is 200': (r) => r.status === 200,
    }) || errorRate.add(1)
  })

  group('Players API', () => {
    // Players list with pagination
    const startPlayers = Date.now()
    const playersRes = http.get(`${BASE_URL}/api/players?page=1&limit=20`, {
      tags: { name: 'players' },
    })
    playersDuration.add(Date.now() - startPlayers)
    playersRequests.add(1)

    const playersOk = check(playersRes, {
      'players returns 200': (r) => r.status === 200,
      'players has data': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.success && body.data
        } catch {
          return false
        }
      },
    })
    if (!playersOk) errorRate.add(1)

    sleep(0.2)

    // Players with search
    const searchRes = http.get(`${BASE_URL}/api/players?search=Judge`, {
      tags: { name: 'search' },
    })
    searchRequests.add(1)

    const searchOk = check(searchRes, {
      'search returns 200': (r) => r.status === 200,
      'search has results': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.success
        } catch {
          return false
        }
      },
    })
    if (!searchOk) errorRate.add(1)

    sleep(0.2)

    // Players with team filter
    const teamRes = http.get(`${BASE_URL}/api/players?team=NYY`, {
      tags: { name: 'players_team' },
    })
    check(teamRes, {
      'team filter returns 200': (r) => r.status === 200,
    }) || errorRate.add(1)
  })

  group('Leaderboard API', () => {
    // Overall leaderboard
    const startLeaderboard = Date.now()
    const leaderboardRes = http.get(`${BASE_URL}/api/leaderboards/overall`, {
      tags: { name: 'leaderboard' },
    })
    leaderboardDuration.add(Date.now() - startLeaderboard)
    leaderboardRequests.add(1)

    const lbOk = check(leaderboardRes, {
      'leaderboard returns 200': (r) => r.status === 200,
      'leaderboard has data': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.success
        } catch {
          return false
        }
      },
    })
    if (!lbOk) errorRate.add(1)

    sleep(0.2)

    // Monthly leaderboard (if available)
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const monthlyRes = http.get(
      `${BASE_URL}/api/leaderboards/monthly?month=${currentMonth}&year=${currentYear}`,
      { tags: { name: 'leaderboard_monthly' } }
    )
    check(monthlyRes, {
      'monthly returns 200 or 404': (r) => r.status === 200 || r.status === 404,
    })
  })

  group('Season API', () => {
    const seasonRes = http.get(`${BASE_URL}/api/season/current`, {
      tags: { name: 'season' },
    })
    check(seasonRes, {
      'season returns 200': (r) => r.status === 200,
    }) || errorRate.add(1)
  })

  sleep(0.5)
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    totalRequests: data.metrics.http_reqs?.values?.count || 0,
    failedRequests: data.metrics.http_req_failed?.values?.passes || 0,
    avgDuration: data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0,
    p95Duration: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
    p99Duration: data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0,
    customMetrics: {
      playersRequests: data.metrics.players_requests?.values?.count || 0,
      searchRequests: data.metrics.search_requests?.values?.count || 0,
      leaderboardRequests: data.metrics.leaderboard_requests?.values?.count || 0,
      errorRate: (data.metrics.errors?.values?.rate * 100)?.toFixed(2) || 0,
    },
  }

  console.log('\n========== API STRESS TEST RESULTS ==========')
  console.log(`Timestamp: ${summary.timestamp}`)
  console.log(`Total Requests: ${summary.totalRequests}`)
  console.log(`Failed Requests: ${summary.failedRequests}`)
  console.log(`Average Response Time: ${summary.avgDuration}ms`)
  console.log(`95th Percentile: ${summary.p95Duration}ms`)
  console.log(`99th Percentile: ${summary.p99Duration}ms`)
  console.log(`Error Rate: ${summary.customMetrics.errorRate}%`)
  console.log('==============================================\n')

  return {
    'stdout': JSON.stringify(summary, null, 2),
  }
}
