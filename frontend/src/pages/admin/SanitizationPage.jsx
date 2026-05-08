import { useState } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import { SectionCard, StatusBlock, Button, PageHeader } from '../../components/ui'

const formatLocalDateTime = (isoString) => {
  const date = new Date(isoString)
  const tzOffset = date.getTimezoneOffset() * 60000
  const localIso = new Date(date - tzOffset).toISOString().slice(0, 16)
  return localIso
}

function SanitizationPage() {
  const [sanitizationDate, setSanitizationDate] = useState(
    formatLocalDateTime(new Date().toISOString())
  )
  const [adminStatus, setAdminStatus] = useState({ loading: false, message: '', error: '' })

  const handleExecuteSanitization = async () => {
    setAdminStatus({ loading: true, message: '', error: '' })
    try {
      const payload = {
        sanitizationRunDateTime: new Date(sanitizationDate).toISOString(),
      }
      await apiClient.post(apiConfig.endpoints.sanitizationExecute, payload)
      setAdminStatus({ loading: false, message: 'Sanitization executed successfully.', error: '' })
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Sanitization execution failed.'
      setAdminStatus({ loading: false, message: '', error: details })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-1">
      <PageHeader title="Sanitization" />

      <SectionCard
        title="Execute Sanitization"
        description="Disband groups missing advisors and trigger notifications."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Run Date / Time
            </label>
            <input
              type="datetime-local"
              value={sanitizationDate}
              onChange={(e) => setSanitizationDate(e.target.value)}
              required
              className="w-full rounded-xl border border-[#1e293b] bg-[#111827] px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/60 disabled:opacity-50"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={handleExecuteSanitization}
            loading={adminStatus.loading}
            disabled={adminStatus.loading}
          >
            {adminStatus.loading ? 'Executing…' : 'Run Sanitization'}
          </Button>
        </div>
        <StatusBlock title="Sanitization" message={adminStatus.message} type="success" />
        <StatusBlock title="Sanitization" message={adminStatus.error} type="error" />
      </SectionCard>
    </div>
  )
}

export default SanitizationPage
