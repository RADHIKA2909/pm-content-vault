import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ChevronDown,
  Database,
  LayoutGrid,
  Link as LinkIcon,
  List,
  Settings as SettingsIcon,
  Sliders,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { useToast } from '../components/ToastContext.jsx'
import { usePreference } from '../lib/preferences.js'
import SettingsCard from '../components/settings/SettingsCard.jsx'
import SettingRow from '../components/settings/SettingRow.jsx'
import SegmentedControl from '../components/settings/SegmentedControl.jsx'
import RadioGroup from '../components/settings/RadioGroup.jsx'
import ComingSoon from '../components/settings/ComingSoon.jsx'
import ResetVaultModal from '../components/settings/ResetVaultModal.jsx'
import { version } from '../../package.json'

const VIEW_OPTIONS = [
  { value: 'grid', label: 'Card view', icon: LayoutGrid },
  { value: 'list', label: 'List view', icon: List },
]

const TARGET_OPTIONS = [
  { value: 'new', label: 'New tab' },
  { value: 'same', label: 'Same tab' },
]

const STYLE_OPTIONS = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
]

const STYLE_HINT = {
  balanced: 'A short overview, then as much detail as the question needs.',
  concise: 'Two or three sentences. Good when you already know the area.',
  detailed: 'Works through the reasoning, with examples and caveats.',
}

function Settings() {
  const [libraryView, setLibraryView] = usePreference('libraryView')
  const [linkTargetPref, setLinkTargetPref] = usePreference('linkTarget')
  const [answerStyle, setAnswerStyle] = usePreference('answerStyle')

  const [stats, setStats] = useState(null)
  const [resetOpen, setResetOpen] = useState(false)

  const { showToast } = useToast()
  const reduceMotion = useReducedMotion()

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/items/stats`)
      setStats(res.ok ? await res.json() : null)
    } catch {
      setStats(null)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // No bulk endpoint exists, so this loops the per-item delete. Embeddings,
  // tags, annotations and duplicate rows all cascade from the schema, so the
  // items are the only thing that has to be asked for.
  const resetVault = async () => {
    try {
      const res = await fetch(`${API_URL}/api/items`)
      const items = res.ok ? await res.json() : []

      await Promise.all(
        items.map((item) => fetch(`${API_URL}/api/items/${item.id}`, { method: 'DELETE' })),
      )

      setResetOpen(false)
      await loadStats()
      showToast(`Vault reset — ${items.length} ${items.length === 1 ? 'item' : 'items'} deleted`)
    } catch {
      showToast('Could not reset the vault', 'error')
    }
  }

  return (
    <div>
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="mb-6"
      >
        <h1 className="flex items-center gap-2.5 text-[24px] font-semibold leading-tight tracking-tight text-text-primary sm:text-[30px]">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-light text-accent"
          >
            <SettingsIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          Settings
        </h1>
        <p className="mt-1 text-body text-text-secondary">
          Manage your vault and application preferences.
        </p>
      </motion.header>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* No sign-in exists in v0 — every item is saved under one fixed
              account, and CLAUDE.md defers multi-user. So this card describes
              what's actually true rather than inventing a session, an email
              and a Sign out button with nothing behind it. */}
          <SettingsCard
            icon={User}
            title="This vault"
            description="Who this data belongs to."
            tone="secondary"
            delay={0}
          >
            <SettingRow
              label="Single-user mode"
              description="There's no sign-in yet. Everything you save belongs to one local vault on this machine."
            >
              <span className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-caption font-medium text-text-secondary">
                Accounts coming later
              </span>
            </SettingRow>
          </SettingsCard>

          <SettingsCard
            icon={Sliders}
            title="General"
            description="Customise how PM Content Vault looks and behaves."
            delay={60}
          >
            <SettingRow
              label="Default library view"
              description="Choose how items are displayed by default."
            >
              <SegmentedControl
                label="Default library view"
                value={libraryView}
                options={VIEW_OPTIONS}
                onChange={setLibraryView}
              />
            </SettingRow>
          </SettingsCard>

          <SettingsCard
            icon={LinkIcon}
            title="Navigation"
            description="Control how links open from your vault."
            tone="success"
            delay={120}
          >
            <SettingRow label="Open links in" description="Where an original source opens when you click it.">
              <RadioGroup
                name="link-target"
                label="Open links in"
                value={linkTargetPref}
                options={TARGET_OPTIONS}
                onChange={setLinkTargetPref}
              />
            </SettingRow>
          </SettingsCard>

          <SettingsCard
            icon={Sparkles}
            title="AI preferences"
            description="Set your default preferences for Ask My Vault."
            delay={180}
          >
            <SettingRow label="Default answer style" description={STYLE_HINT[answerStyle]}>
              <label className="relative flex items-center">
                <span className="sr-only">Default answer style</span>
                <select
                  value={answerStyle}
                  onChange={(e) => setAnswerStyle(e.target.value)}
                  className="w-[150px] cursor-pointer appearance-none rounded-xl bg-surface py-2 pl-3 pr-8 text-caption font-medium text-text-primary shadow-raised ring-1 ring-border-subtle transition-all duration-200 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 h-4 w-4 text-text-secondary"
                  strokeWidth={2}
                />
              </label>
            </SettingRow>
          </SettingsCard>

          <SettingsCard
            icon={Database}
            title="Data"
            description="Manage your vault data."
            tone="warning"
            delay={240}
          >
            <SettingRow
              label="Reset vault"
              description={
                stats
                  ? `Deletes all ${stats.items} saved items, notes and highlights. This cannot be undone.`
                  : 'Deletes all saved items, notes and highlights. This cannot be undone.'
              }
            >
              <button
                onClick={() => setResetOpen(true)}
                disabled={!stats?.items}
                className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-sm font-medium text-warning shadow-card ring-1 ring-warning/40 transition-colors duration-200 hover:bg-warning/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-warning disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Reset vault
              </button>
            </SettingRow>
          </SettingsCard>
        </div>

        <div className="w-full shrink-0 lg:w-[300px]">
          <ComingSoon />
        </div>
      </div>

      <p className="mt-8 text-center text-caption text-text-secondary">
        PM Content Vault <span aria-hidden="true">·</span> Version {version}
      </p>

      <ResetVaultModal
        open={resetOpen}
        stats={stats}
        onClose={() => setResetOpen(false)}
        onConfirm={resetVault}
      />
    </div>
  )
}

export default Settings
