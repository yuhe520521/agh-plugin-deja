import { run, isInstalled, argv, recallArgv, recallSilence, answer } from './lib/deja.mjs'

const Kind = Symbol.for('TypeBox.Kind')
const Optional = Symbol.for('TypeBox.Optional')
const optional = (s) => ({ ...s, [Optional]: 'Optional' })
const str = (o = {}) => ({ [Kind]: 'String', type: 'string', ...o })
const num = (o = {}) => ({ [Kind]: 'Number', type: 'number', ...o })
const int = (o = {}) => ({ [Kind]: 'Integer', type: 'integer', ...o })
const bool = (o = {}) => ({ [Kind]: 'Boolean', type: 'boolean', ...o })
const enumOf = (...v) => ({ [Kind]: 'Union', anyOf: v.map((x) => ({ [Kind]: 'Literal', type: 'string', const: x })) })
const obj = (properties = {}, required = []) => ({ [Kind]: 'Object', type: 'object', additionalProperties: false, required, properties })
const rec = (o = {}) => {
  const { additionalProperties: _ap, ...rest } = o
  return { [Kind]: 'Object', type: 'object', ...rest, properties: rest.properties || {} }
}

function textResult(value) {
  const text = typeof value === 'string'
    ? value
    : (value === undefined || value === null ? '' : JSON.stringify(value, null, 2))
  return { content: [{ type: 'text', text }] }
}

const TOOL_DEFS = [
  {
    name: 'agh_deja_recall',
    desc: "Search this machine's own past AI coding sessions — every agent used on it, including months before deja was installed. Use before debugging an error or re-implementing anything that may already exist, and before the first edit in a task and before calling a change done or ready to merge. Match on the most specific token available: an exact error string, function name, file path or flag.",
    params: obj({
      query: str(),
      limit: optional(num()),
      offset: optional(num()),
    }, ['query']),
    action: 'recall',
    isReadOnly: true,
  },
  {
    name: 'agh_deja_session',
    desc: "A full digest of the single best-matching past session — what was tried, what was decided, what it cost. Use after agh_deja_recall when the reasoning behind an earlier decision matters, not just that it happened.",
    params: obj({ query: str() }, ['query']),
    action: 'session',
    isReadOnly: true,
  },
  {
    name: 'agh_deja_blame',
    desc: "The past sessions that discussed a file, so you know why it is shaped the way it is before editing, refactoring or deleting it. Session history, not git authorship.",
    params: obj({ path: str() }, ['path']),
    action: 'blame',
    isReadOnly: true,
  },
  {
    name: 'agh_deja_fix',
    desc: "What this machine ran after that same error before, in the sessions where the error did not come back. Paste the failing output verbatim rather than a paraphrase — the match is on the error's own words.",
    params: obj({ error: str() }, ['error']),
    action: 'fix',
    isReadOnly: true,
  },
  {
    name: 'agh_deja_how',
    desc: "The real invocation this machine uses for a build, test, deploy or script, with the flags it actually ran, ordered by how many sessions ran it. A guessed command is plausible and fails on this setup.",
    params: obj({ what: str() }, ['what']),
    action: 'how',
    isReadOnly: true,
  },
  {
    name: 'agh_deja_remember',
    desc: "Store one durable decision once it is settled, as a single self-contained fact that will make sense months later. Not transcripts, not a summary of the conversation, and not anything already obvious from the code.",
    params: obj({ text: str() }, ['text']),
    action: 'remember',
    isReadOnly: false,
  },
  {
    name: 'agh_deja_search',
    desc: "Search this machine's past AI coding sessions. Returns JSON hits with session IDs, titles, and snippets.",
    params: obj({ query: str() }, ['query']),
    action: 'search',
    isReadOnly: true,
  },
  {
    name: 'agh_deja_settings_section',
    desc: "Settings section for the deja-vu plugin. In AGH, this returns the current installation status and configuration info.",
    params: obj({}, []),
    action: 'settings',
    isReadOnly: true,
  },
  {
    name: 'agh_deja_shell_overlay',
    desc: "Shell overlay for deja-vu. In AGH, this returns the current deja binary status and availability.",
    params: obj({}, []),
    action: 'shell',
    isReadOnly: true,
  },
  {
    name: 'agh_deja_project',
    desc: "Search this machine's past AI coding sessions for the current project context.",
    params: obj({ query: optional(str()) }, []),
    action: 'project',
    isReadOnly: true,
  },
  {
    name: 'agh_deja_recall_alias',
    desc: "Search this machine's past AI coding sessions. Alias for agh_deja_recall.",
    params: obj({
      query: str(),
      limit: optional(num()),
      offset: optional(num()),
    }, ['query']),
    action: 'recall',
    isReadOnly: true,
  },
]

async function dispatch(action, args) {
  if (!isInstalled()) {
    return answer('')
  }
  switch (action) {
    case 'recall': {
      const callArgs = recallArgv(args)
      const out = run(callArgs)
      return out || recallSilence(callArgs.join(' '))
    }
    case 'session':
      return answer(run(argv('ctx', [], args.query)))
    case 'blame':
      return answer(run(argv('blame', [], args.path)))
    case 'fix':
      return answer(run(argv('fix', [], args.error)))
    case 'how':
      return answer(run(argv('how', [], args.what)))
    case 'remember':
      return answer(run(argv('remember', [], args.text)))
    case 'search': {
      const out = run(['search', '--harness', 'deepseek', '--json', '--limit', '20', '--', args.query])
      if (!out) return answer('')
      try {
        return JSON.parse(out)
      } catch {
        return 'Failed to parse deja search output.'
      }
    }
    case 'settings':
      return { installed: isInstalled(), status: 'AGH adapter for deja-vu. UI settings panel not supported.' }
    case 'shell':
      return { installed: isInstalled(), status: 'Shell overlay not supported in AGH.' }
    case 'project': {
      const q = args.query || ''
      const out = run(['search', '--harness', 'deepseek', '--json', '--limit', '5', '--', q])
      if (!out) return answer('')
      try {
        return JSON.parse(out)
      } catch {
        return 'Failed to parse deja project output.'
      }
    }
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

export const dejaVu = {
  inject: ['tools'],
  apply(ctx) {
    for (const def of TOOL_DEFS) {
      ctx.tools.register({
        name: def.name,
        description: def.desc,
        parameters: def.params,
        meta: {
          isReadOnly: def.isReadOnly,
          isDestructive: false,
          isConcurrencySafe: false,
          isOpenWorld: false,
          replay: def.isReadOnly ? 'safe' : 'never',
          costHint: {},
          deferLoading: true,
          discoveryGroup: 'deja-vu',
          requiresApproval: def.isReadOnly ? 'never' : 'always',
        },
        async execute(args) {
          const result = await dispatch(def.action, args)
          return textResult(result)
        },
      })
    }
  },
}