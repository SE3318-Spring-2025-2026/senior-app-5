import { useState } from 'react'
import apiClient from '../../utils/apiClient'
import apiConfig from '../../config/api'
import { SectionCard, StatusBlock, Button, PageHeader } from '../../components/ui'

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
    <div className="max-w-4xl mx-auto space-y-5 p-1">
      <PageHeader title="Advisor Validation" />

      <SectionCard title="Advisor Validation" description="Check all groups for missing advisor assignments.">
        <div className="mb-4">
          <Button variant="primary" onClick={handleValidateAdvisors} loading={adminStatus.loading} disabled={adminStatus.loading}>
            {adminStatus.loading ? 'Checking…' : 'Validate Advisors'}
          </Button>
        </div>
        <StatusBlock title="Advisor Validation" message={adminStatus.message} type="success" />
        <StatusBlock title="Advisor Validation" message={adminStatus.error} type="error" />
        {validationResults.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#1e293b]">
            <table className="w-full">
              <thead className="bg-[#080f1f]">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Group ID</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Assignment Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {validationResults.map((item) => (
                  <tr key={item.groupId} className="border-t border-[#1e293b] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">{item.groupId}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{item.advisorAssignmentStatus}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {new Date(item.advisorDeadline).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export default AdvisorsPage
