import { Info } from 'lucide-react'
import Card from '../components/Card.jsx'

function Settings() {
  return (
    <div>
      <h1 className="text-[30px] font-semibold tracking-tight text-text-primary">Settings</h1>
      <p className="mb-6 text-body text-text-secondary">Account and preferences.</p>

      <Card className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
        <div>
          <p className="text-sm text-text-primary">
            PM Content Vault is running in <span className="font-medium">v0 / single-user</span> mode.
          </p>
          <p className="mt-1 text-caption text-text-secondary">
            There's no login yet — everything you save belongs to one fixed account. Multi-user accounts,
            authentication, and preferences will live here once that's built.
          </p>
        </div>
      </Card>
    </div>
  )
}

export default Settings
