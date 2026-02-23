/**
 * Alert Service
 * Handles admin notifications for job failures and system alerts
 */

import { sendEmail } from './emailService.js'
import { supabaseAdmin } from '../config/supabase.js'

const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || process.env.FROM_EMAIL || 'admin@hrderbyus.com'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export type JobName = 'update_stats' | 'import_season' | 'calculate_leaderboard' | 'recalculate_all' | 'news_digest'
export type JobStatus = 'success' | 'failed' | 'running' | 'partial'

export interface JobExecutionLog {
  id: string
  jobName: JobName
  status: JobStatus
  startTime: string
  endTime?: string
  durationMs?: number
  errorMessage?: string
  errorStack?: string
  context?: Record<string, unknown>
  adminNotified: boolean
  notifiedAt?: string
  createdAt: string
}

export interface JobFailureAlert {
  jobName: JobName
  error: string
  errorStack?: string
  timestamp: string
  attempt?: number
  maxRetries?: number
  context?: Record<string, unknown>
}

/**
 * Log job execution start
 */
export async function logJobStart(
  jobName: JobName,
  context?: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('JobExecutionLog')
    .insert({
      jobName,
      status: 'running',
      startTime: new Date().toISOString(),
      context,
      adminNotified: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to log job start:', error)
    throw error
  }

  console.log(`📝 Job ${jobName} started (ID: ${data.id})`)
  return data.id
}

/**
 * Log job execution completion (success or failure)
 */
export async function logJobComplete(
  jobId: string,
  status: 'success' | 'failed' | 'partial',
  details: {
    errorMessage?: string
    errorStack?: string
    context?: Record<string, unknown>
  } = {}
): Promise<void> {
  const endTime = new Date().toISOString()

  // Get start time to calculate duration
  const { data: job } = await supabaseAdmin
    .from('JobExecutionLog')
    .select('startTime, context')
    .eq('id', jobId)
    .single()

  const startTime = job?.startTime ? new Date(job.startTime) : new Date()
  const durationMs = new Date(endTime).getTime() - startTime.getTime()

  const { error } = await supabaseAdmin
    .from('JobExecutionLog')
    .update({
      status,
      endTime,
      durationMs,
      errorMessage: details.errorMessage,
      errorStack: details.errorStack,
      context: { ...job?.context, ...details.context },
    })
    .eq('id', jobId)

  if (error) {
    console.error('Failed to log job completion:', error)
  }

  const statusEmoji = status === 'success' ? '✅' : status === 'partial' ? '⚠️' : '❌'
  console.log(`${statusEmoji} Job completed (ID: ${jobId}) - ${status} in ${durationMs}ms`)
}

/**
 * Mark job as admin notified
 */
async function markJobNotified(jobId: string): Promise<void> {
  await supabaseAdmin
    .from('JobExecutionLog')
    .update({
      adminNotified: true,
      notifiedAt: new Date().toISOString(),
    })
    .eq('id', jobId)
}

/**
 * Send admin alert for job failure
 */
export async function alertAdminJobFailure(
  alert: JobFailureAlert,
  jobId?: string
): Promise<void> {
  console.log(`🚨 Sending admin alert for ${alert.jobName} failure...`)

  const jobNameDisplay = {
    update_stats: 'Daily Stats Update',
    import_season: 'Season Import',
    calculate_leaderboard: 'Leaderboard Calculation',
    recalculate_all: 'Full Recalculation',
    news_digest: 'Daily News Digest',
  }[alert.jobName] || alert.jobName

  const attemptInfo = alert.attempt && alert.maxRetries
    ? `<p><strong>Attempt:</strong> ${alert.attempt}/${alert.maxRetries} (all retries exhausted)</p>`
    : ''

  const contextInfo = alert.context
    ? `<p><strong>Context:</strong></p><pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(alert.context, null, 2)}</pre>`
    : ''

  const stackTrace = alert.errorStack
    ? `<details><summary>Stack Trace</summary><pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${alert.errorStack}</pre></details>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .alert-header {
      background-color: #fee2e2;
      border: 2px solid #ef4444;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .alert-header h1 {
      color: #dc2626;
      margin: 0 0 10px 0;
    }
    .error-box {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
    }
    .error-message {
      color: #991b1b;
      font-family: monospace;
      word-break: break-word;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #0066cc;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert-header">
      <h1>Scheduled Job Failed</h1>
      <p><strong>Job:</strong> ${jobNameDisplay}</p>
      <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
      ${attemptInfo}
    </div>

    <div class="error-box">
      <p><strong>Error Message:</strong></p>
      <p class="error-message">${alert.error}</p>
    </div>

    ${contextInfo}
    ${stackTrace}

    <h3>Recommended Actions:</h3>
    <ol>
      <li>Check the server logs for more details</li>
      <li>Verify Python environment is healthy: <code>GET /health/python</code></li>
      <li>Try running the job manually if needed</li>
      <li>If the issue persists, check database connectivity</li>
    </ol>

    <a href="${FRONTEND_URL}/admin" class="button">Open Admin Dashboard</a>

    <div class="footer">
      <p>This is an automated alert from Home Run Derby 2.0</p>
      <p>To configure alerts, update ADMIN_ALERT_EMAIL in environment variables.</p>
    </div>
  </div>
</body>
</html>
  `

  try {
    await sendEmail({
      to: ADMIN_ALERT_EMAIL,
      subject: `[HRD Alert] ${jobNameDisplay} Failed`,
      html,
    })

    console.log(`✅ Admin alert sent to ${ADMIN_ALERT_EMAIL}`)

    // Mark job as notified if we have a job ID
    if (jobId) {
      await markJobNotified(jobId)
    }
  } catch (emailError) {
    console.error('❌ Failed to send admin alert email:', emailError)
    // Don't throw - we don't want alert failure to cascade
  }
}

/**
 * Get recent job executions
 */
export async function getRecentJobExecutions(
  limit: number = 20,
  jobName?: JobName
): Promise<JobExecutionLog[]> {
  let query = supabaseAdmin
    .from('JobExecutionLog')
    .select('*')
    .order('startTime', { ascending: false })
    .limit(limit)

  if (jobName) {
    query = query.eq('jobName', jobName)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to get job executions:', error)
    return []
  }

  return data || []
}

/**
 * Get latest execution for each job type
 */
export async function getLatestJobExecutions(): Promise<Record<JobName, JobExecutionLog | null>> {
  const jobNames: JobName[] = ['update_stats', 'import_season', 'calculate_leaderboard', 'recalculate_all', 'news_digest']
  const result: Record<JobName, JobExecutionLog | null> = {
    update_stats: null,
    import_season: null,
    calculate_leaderboard: null,
    recalculate_all: null,
    news_digest: null,
  }

  for (const jobName of jobNames) {
    const { data } = await supabaseAdmin
      .from('JobExecutionLog')
      .select('*')
      .eq('jobName', jobName)
      .order('startTime', { ascending: false })
      .limit(1)
      .single()

    result[jobName] = data || null
  }

  return result
}

/**
 * Get job execution statistics
 */
export async function getJobStats(
  jobName: JobName,
  days: number = 30
): Promise<{
  total: number
  successful: number
  failed: number
  successRate: number
  avgDurationMs: number
}> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabaseAdmin
    .from('JobExecutionLog')
    .select('status, durationMs')
    .eq('jobName', jobName)
    .gte('startTime', since.toISOString())
    .neq('status', 'running')

  if (error || !data) {
    return { total: 0, successful: 0, failed: 0, successRate: 0, avgDurationMs: 0 }
  }

  const total = data.length
  const successful = data.filter(j => j.status === 'success').length
  const failed = data.filter(j => j.status === 'failed').length
  const durations = data.filter(j => j.durationMs).map(j => j.durationMs as number)
  const avgDurationMs = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    avgDurationMs,
  }
}
