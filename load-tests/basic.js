import http from 'k6/http'
import { check, sleep } from 'k6'
import { BASE_URL, thresholds, stages } from './config.js'

export const options = {
  stages: stages.smoke,
  thresholds: thresholds,
}

export default function () {
  // Test 1: Health endpoint
  const healthRes = http.get(`${BASE_URL}/health`)
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response has success': (r) => {
      try {
        return JSON.parse(r.body).success === true
      } catch {
        return false
      }
    },
    'health returns timestamp': (r) => {
      try {
        return JSON.parse(r.body).timestamp !== undefined
      } catch {
        return false
      }
    },
  })

  sleep(0.5)

  // Test 2: API root endpoint
  const apiRes = http.get(`${BASE_URL}/api`)
  check(apiRes, {
    'api status is 200': (r) => r.status === 200,
    'api returns welcome message': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.message && body.message.includes('Home Run Derby')
      } catch {
        return false
      }
    },
  })

  sleep(0.5)

  // Test 3: Players endpoint (public)
  const playersRes = http.get(`${BASE_URL}/api/players?limit=10`)
  check(playersRes, {
    'players status is 200': (r) => r.status === 200,
    'players returns success': (r) => {
      try {
        return JSON.parse(r.body).success === true
      } catch {
        return false
      }
    },
    'players returns data array': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.data && body.data.players !== undefined
      } catch {
        return false
      }
    },
  })

  sleep(0.5)

  // Test 4: Season endpoint (public)
  const seasonRes = http.get(`${BASE_URL}/api/season/current`)
  check(seasonRes, {
    'season status is 200': (r) => r.status === 200,
    'season returns data': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.success === true
      } catch {
        return false
      }
    },
  })

  sleep(0.5)

  // Test 5: Leaderboard endpoint (public)
  const leaderboardRes = http.get(`${BASE_URL}/api/leaderboards/overall`)
  check(leaderboardRes, {
    'leaderboard status is 200': (r) => r.status === 200,
    'leaderboard returns success': (r) => {
      try {
        return JSON.parse(r.body).success === true
      } catch {
        return false
      }
    },
  })

  sleep(1)
}

// Summary output customization
export function handleSummary(data) {
  console.log('\n=== Load Test Summary ===')
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`)
  console.log(`Failed Requests: ${data.metrics.http_req_failed.values.passes}`)
  console.log(`Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`)
  console.log(`95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`)
  console.log('========================\n')

  return {
    stdout: JSON.stringify(data, null, 2),
  }
}
