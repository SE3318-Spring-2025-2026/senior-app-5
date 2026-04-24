import ProfessorForm from '../../components/ProfessorForm'
import styles from '../GroupLifecyclePage.module.css'

function ProfessorsPage() {
  return (
    <div className={styles.pageContainer}>
      <ProfessorForm />
    </div>
  )
}

export default ProfessorsPage