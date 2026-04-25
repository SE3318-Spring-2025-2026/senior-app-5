import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import toast from 'react-hot-toast'
import styles from '../pages/CoordinatorManagementPage.module.css'


const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

export function CreateCoordinatorForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3001/api/v1/auth/admin/coordinators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create coordinator account.')
      }

      toast.success('Coordinator account created successfully! 🚀')
      reset()
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <label>
        Name
        <input type="text" placeholder="e.g. John Doe" {...register('name')} />
        {errors.name && <span style={{ color: '#ff4d4f', fontSize: '0.85rem', marginTop: '4px' }}>{errors.name.message}</span>}
      </label>

      <label>
        Email Address
        <input type="email" placeholder="e.g. john@example.com" {...register('email')} />
        {errors.email && <span style={{ color: '#ff4d4f', fontSize: '0.85rem', marginTop: '4px' }}>{errors.email.message}</span>}
      </label>

      <label>
        Password
        <input type="password" placeholder="******" {...register('password')} />
        {errors.password && <span style={{ color: '#ff4d4f', fontSize: '0.85rem', marginTop: '4px' }}>{errors.password.message}</span>}
      </label>

      <div className={styles.inlineActions}>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Register Coordinator'}
        </button>
      </div>
    </form>
  )
}
