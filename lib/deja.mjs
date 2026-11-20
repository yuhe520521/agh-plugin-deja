import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PLATFORM = process.platform === 'win32' ? 'windows' : process.platform
const ARCH = process.arch === 'x64' ? 'amd64' : process.arch

function resolveDeja() {
  const exe = PLATFORM === 'windows' ? 'deja.exe' : 'deja'
  const candidates = [process.env.DEJA_BIN, exe]
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      execFileSync(candidate, ['version'], {
        windowsHide: true,
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      return candidate
    } catch {}
  }
  return exe
}

const DEJA = resolveDeja()

const INSTALLED = (() => {
  try {
    return execFileSync(DEJA, ['version'], {
      windowsHide: true,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() !== ''
  } catch {
    return false
  }
})()

export function isInstalled() {
  return INSTALLED
}

export function run(args, input) {
  if (!INSTALLED) return ''
  try {
    return execFileSync(DEJA, args, {
      windowsHide: true,
      encoding: 'utf8',
      timeout: 20000,
      maxBuffer: 8 * 1024 * 1024,
      input,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

export function argv(cmd, flags, text) {
  const arg = String(text)
  return arg.startsWith('-') ? [cmd, ...flags, '--', arg] : [cmd, ...flags, arg]
}

export function recallArgv(args) {
  const count = (v, fallback) => {
    const n = Math.trunc(Number(v))
    return v == null || v === '' || !Number.isFinite(n) ? fallback : n
  }
  const limit = Math.min(20, Math.max(1, count(args && args.limit, 5)))
  const offset = Math.min(1e9, Math.max(0, count(args && args.offset, 0)))
  const flags = ['--limit', String(limit)]
  if (offset > 0) flags.push('--offset', String(offset))
  return argv('recall', flags, args && args.query)
}

export function recallSilence(call) {
  if (call.includes('--offset')) {
    return 'This deja cannot page recall. Run deja update, then ask again with the same offset.'
  }
  return "Nothing in this machine's history matches that."
}

export function answer(text) {
  if (INSTALLED) return text || "Nothing in this machine's history matches that."
  return 'deja is not installed on this machine, so there is no history to search. Install it with: curl -fsSL https://raw.githubusercontent.com/vshulcz/deja-vu/main/install.sh | sh'
}