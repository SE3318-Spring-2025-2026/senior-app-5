import { createContext, useContext, useState } from 'react'

const AdminGroupContext = createContext(null)

export const AdminGroupProvider = ({ children }) => {
  const [currentGroupId, setCurrentGroupId] = useState('')

  return (
    <AdminGroupContext.Provider value={{ currentGroupId, setCurrentGroupId }}>
      {children}
    </AdminGroupContext.Provider>
  )
}

export const useAdminGroup = () => {
  const context = useContext(AdminGroupContext)
  if (!context) {
    throw new Error('useAdminGroup must be used within AdminGroupProvider')
  }
  return context
}
