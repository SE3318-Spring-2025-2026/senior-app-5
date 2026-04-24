import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import authService from '../utils/authService';
import styles from './ProfessorForm.module.css';

const ROLES = ['Professor'];

const professorSchema = z.object({
  name: z.string({ message: 'Name is required' }).min(2).max(100),
  email: z.string({ message: 'Email is required' }).email('Invalid email address'),
  role: z.string({ message: 'Role is required' }).refine((val) => ROLES.includes(val), 'Invalid role selected'),
});

export function ProfessorForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(professorSchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '', role: '' },
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setApiError('');

    try {
      await authService.registerProfessor(data.name, data.email, data.role);
      reset();
      toast.success(`Professor ${data.name} created successfully.`);
    } catch (error) {
      const message = error.message || 'Failed to create professor.';
      setApiError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Professor</h2>
          <p className={styles.subtitle}>Create a professor account</p>
        </div>

        {apiError && (
          <div className={`${styles.message} ${styles.error}`} role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>Professor Name *</label>
            <input id="name" type="text" className={`${styles.input} ${errors.name ? styles.inputError : ''}`} {...register('name')} disabled={isSubmitting} />
            {errors.name && <span className={styles.errorText}>{errors.name.message}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email *</label>
            <input id="email" type="email" className={`${styles.input} ${errors.email ? styles.inputError : ''}`} {...register('email')} disabled={isSubmitting} />
            {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="role" className={styles.label}>Role *</label>
            <select id="role" className={`${styles.select} ${errors.role ? styles.inputError : ''}`} {...register('role')} disabled={isSubmitting}>
              <option value="">Select role</option>
              {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            {errors.role && <span className={styles.errorText}>{errors.role.message}</span>}
          </div>

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Professor'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfessorForm;