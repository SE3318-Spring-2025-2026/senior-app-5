import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import toast from 'react-hot-toast'
import apiClient from '../utils/apiClient'

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

const inputClass =
  'w-full rounded-xl border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-slate-200 ' +
  'placeholder:text-slate-600 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30'

export function CreateCoordinatorForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      await apiClient.post('/auth/admin/coordinators', data)
      toast.success('Coordinator account created successfully.')
      reset()
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || 'Failed to create coordinator account.'
      toast.error(`Error: ${errorMsg}`)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-400">Name</label>
        <input
          type="text"
          placeholder="e.g. John Doe"
          className={inputClass}
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-400">Email Address</label>
        <input
          type="email"
          placeholder="e.g. john@example.com"
          className={inputClass}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-400">Password</label>
        <input
          type="password"
          placeholder="••••••"
          className={inputClass}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Processing…' : 'Register Coordinator'}
      </button>
    </form>
  )
}
