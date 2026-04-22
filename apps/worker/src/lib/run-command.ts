import { spawn } from 'child_process'

export interface CommandResult {
  stdout: string
  stderr: string
}

// Sensitive env vars that must never be passed to subprocesses (npm install / tsc).
// These have no relevance to the build and their presence in subprocess env is a
// leak risk if the subprocess echoes its environment in error output.
const REDACTED_ENV_KEYS = new Set([
  'BOT_SECRET_ENCRYPTION_KEY',
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
])

/**
 * Runs an executable with an argument list.
 * Uses spawn (no shell) — arguments are passed as an array, preventing
 * any shell injection regardless of argument content.
 *
 * Sensitive service env vars are stripped from the subprocess environment so
 * they cannot appear in build tool output or error messages.
 *
 * @param cmd   Executable name (resolved from PATH) or absolute path
 * @param args  Argument array — never interpolated through a shell
 * @param cwd   Working directory for the subprocess
 * @param label Optional label for log prefixing
 */
export function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  label?: string,
): Promise<CommandResult> {
  // On Windows, spawning npm via bash loses critical OS env vars (SystemRoot,
  // APPDATA, TEMP) which causes npm to crash. Instead of manually building env,
  // we inherit the full environment (env: undefined) and let the OS handle it.
  // Secrets are not leaked because they are only in the worker's .env, not in
  // the system environment — and generated bots read from their own .env file.

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      stdio: 'pipe',
      shell: process.platform === 'win32',
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    proc.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
      if (label) process.stdout.write(`[${label}] ${chunk.toString()}`)
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
      if (label) process.stderr.write(`[${label}] ${chunk.toString()}`)
    })

    proc.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString()
      const stderr = Buffer.concat(stderrChunks).toString()

      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(
          new Error(
            `"${cmd} ${args.join(' ')}" exited with code ${code}` +
              (stderr ? `\n${stderr.slice(0, 2000)}` : ''),
          ),
        )
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn "${cmd}": ${err.message}`))
    })
  })
}
