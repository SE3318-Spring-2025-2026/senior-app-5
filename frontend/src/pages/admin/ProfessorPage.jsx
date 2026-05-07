import ProfessorForm from '../../components/ProfessorForm'
import { PageHeader } from '../../components/ui'

function ProfessorsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 p-1">
      <PageHeader title="Professors" />
      <ProfessorForm />
    </div>
  )
}

export default ProfessorsPage
