import { useState } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import styles from '../GroupLifecyclePage.module.css'

function SectionCard({ title, description, children }) {
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function StatusBlock({ title, message, type }) {
  if (!message) return null
  return (
    <div className={`${styles.statusBlock} ${type === 'error' ? styles.error : styles.success}`}>
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  )
}

function AdvisorsPage() {
  const [validationResults, setValidationResults] = useState([])
  const [adminStatus, setAdminStatus] = useState({ loading: false, message: '', error: '' })

  const handleValidateAdvisors = async () => {
    setAdminStatus({ loading: true, message: '', error: '' })
    try {
      const response = await apiClient.get(apiConfig.endpoints.advisorValidation)
      setValidationResults(response.data || [])
      const message = response.data?.length
        ? `${response.data.length} group(s) require advisor validation.`
        : 'All groups have advisor assignments.'
      setAdminStatus({ loading: false, message, error: '' })
    } catch (error) {
      const details = error.response?.data?.message || error.message || 'Advisor validation failed.'
      setAdminStatus({ loading: false, message: '', error: details })
    }
  }

  return (
    <div className={styles.pageContainer}>
      <SectionCard title="Advisor Validation" description="Check all groups for missing advisor assignments.">
        <div className={styles.controlRow}>
          <button onClick={handleValidateAdvisors} disabled={adminStatus.loading}>
            {adminStatus.loading ? 'Checking…' : 'Validate Advisors'}
          </button>
        </div>
        <StatusBlock title="Advisor Validation" message={adminStatus.message} type="success" />
        <StatusBlock title="Advisor Validation" message={adminStatus.error} type="error" />
        {validationResults.length > 0 && (
          <div className={styles.resultBox}>
            <strong>Validation Results</strong>
            <ul className={styles.resultList}>
              {validationResults.map((item) => (
                <li key={item.groupId}>
                  <span>{item.groupId}</span>
                  <small>
                    {item.advisorAssignmentStatus} — deadline{' '}
                    {new Date(item.advisorDeadline).toLocaleString()}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export default AdvisorsPage
