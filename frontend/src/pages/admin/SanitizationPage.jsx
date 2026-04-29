import { useState } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import { SectionCard, StatusBlock } from '../../components/ui'
import styles from '../GroupLifecyclePage.module.css'

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
    <div className={styles.pageContainer}>
      <SectionCard
        title="Execute Sanitization"
        description="Disband groups missing advisors and trigger notifications."
      >
        <div className={styles.form}>
          <label>
            Run Date / Time
            <input
              type="datetime-local"
              value={sanitizationDate}
              onChange={(e) => setSanitizationDate(e.target.value)}
              required
            />
          </label>
          <button type="button" onClick={handleExecuteSanitization} disabled={adminStatus.loading}>
            {adminStatus.loading ? 'Executing…' : 'Run Sanitization'}
          </button>
        </div>
        <StatusBlock title="Sanitization" message={adminStatus.message} type="success" />
        <StatusBlock title="Sanitization" message={adminStatus.error} type="error" />
      </SectionCard>
    </div>
  )
}

export default SanitizationPage
