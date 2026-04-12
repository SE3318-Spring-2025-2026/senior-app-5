import RegisterPage from './pages/RegisterPage'
import StudentDashboard from './pages/StudentDashboard' // Senin yeni sayfan
import './App.css'

function App() {
  return (
    <div className="app">
      {/* ŞİMDİLİK ORİJİNAL KAYIT SAYFASI AKTİF */}
      <RegisterPage />

      {/* TEST ETMEK İÇİN: 
          Yukarıdaki <RegisterPage /> satırını yoruma alıp, 
          aşağıdaki <StudentDashboard /> satırını açabilirsiniz.
      */}
      {/* <StudentDashboard /> */}
    </div>
  )
}

export default App

/* ==========================================================
   DEVELOPER TEST NOTLARI (Issue #63)
   ----------------------------------------------------------
   Bu PR ile StudentDashboard.tsx ve DocumentStatusBanner.tsx 
   bileşenleri eklenmiştir. 
   ========================================================== */