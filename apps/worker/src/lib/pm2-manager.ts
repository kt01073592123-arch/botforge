import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

/**
 * PM2 process manager — thin wrapper around the PM2 CLI.
 *
 * Why CLI instead of PM2's programmatic API:
 *   - execFile passes args as an array → zero shell injection risk
 *   - No daemon connection lifecycle to manage inside a BullMQ job
 *   - Identical to what an operator would run interactively; easy to debug
 *
 * Prerequisite: pm2 must be globally installed on the VPS (`npm i -g pm2`)
 * and the pm2 daemon started (`pm2 startup && pm2 save`).
 */

/**
 * Starts a bot process under PM2.
 * If a process with the same name already exists, it is deleted first
 * so the new workspace/build takes effect cleanly.
 *
 * @param name          PM2 process name, e.g. "bot-clxyz..."
 * @param workspacePath Absolute path to the workspace root
 */
export async function startBotProcess(
  name: string,
  workspacePath: string,
): Promise<void> {
  const script = path.join(workspacePath, 'dist', 'bot.js')

  // Remove any pre-existing process (ignore error if it doesn't exist)
  await pm2('delete', name).catch(() => {})

  // Start the new process
  // Flags used:
  //   --cwd          sets the working directory so dotenv finds .env
  //   --update-env   passes current environment to the new process
  //   --no-watch     disable watch mode in production
  await pm2(
    'start', script,
    '--name', name,
    '--cwd', workspacePath,
    '--update-env',
  )
}

/**
 * Stops and removes a PM2-managed bot process.
 * Silent if the process doesn't exist.
 */
export async function stopBotProcess(name: string): Promise<void> {
  await pm2('delete', name).catch(() => {})
}

/**
 * Removes PM2 processes for projects that are no longer in the active set.
 * Only considers processes whose names start with "bot-" (our naming convention).
 *
 * @param activeProjectIds Project IDs whose PM2 processes should be kept.
 */
export async function cleanupOrphanProcesses(
  activeProjectIds: Set<string>,
): Promise<{ removed: string[]; errors: string[] }> {
  const removed: string[] = []
  const errors: string[] = []

  let list: Array<{ name: string }>
  try {
    const { stdout } = await pm2('jlist')
    list = JSON.parse(stdout) as Array<{ name: string }>
  } catch {
    return { removed, errors } // PM2 daemon not running or jlist failed
  }

  for (const proc of list) {
    if (typeof proc.name !== 'string') continue
    if (!proc.name.startsWith('bot-')) continue
    const projectId = proc.name.slice('bot-'.length)
    if (activeProjectIds.has(projectId)) continue

    try {
      await pm2('delete', proc.name).catch(() => {})
      removed.push(proc.name)
    } catch (err) {
      errors.push(`${proc.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { removed, errors }
}

/**
 * Returns the PM2 status of a named process, or null if not found.
 */
export async function getProcessStatus(name: string): Promise<string | null> {
  try {
    const { stdout } = await pm2('jlist')
    const list = JSON.parse(stdout) as Array<{ name: string; pm2_env?: { status?: string } }>
    const entry = list.find((p) => p.name === name)
    return entry?.pm2_env?.status ?? null
  } catch {
    return null
  }
}

// ── Internal helper ────────────────────────────────────────────────────────────

/**
 * Calls the pm2 executable with the given arguments.
 * Uses execFile (no shell) — all arguments are passed directly.
 */
function pm2(...args: string[]): Promise<{ stdout: string; stderr: string }> {
  const opts = process.platform === 'win32' ? { shell: true } : {}
  return execFileAsync('pm2', args, opts)
}
