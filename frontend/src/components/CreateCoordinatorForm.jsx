import React, { useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient'; 
import styles from './CreateCoordinatorForm.module.css';

const CreateCoordinatorForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  
  const validateForm = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error('All fields are required.');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address.');
      return false;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      
      await apiClient.post('/auth/admin/coordinators', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      toast.success('Coordinator account created successfully!');
      
      
      setFormData({ name: '', email: '', password: '' });
      
    } catch (error) {
      console.error('Coordinator creation error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create coordinator account. Email might already exist.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.title}>🛡️ Create Coordinator</h2>
      <form onSubmit={handleSubmit}>
        
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            className={styles.input}
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. John Doe"
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            className={styles.input}
            value={formData.email}
            onChange={handleChange}
            placeholder="coordinator@university.edu"
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="password">Temporary Password</label>
          <input
            type="password"
            id="password"
            name="password"
            className={styles.input}
            value={formData.password}
            onChange={handleChange}
            placeholder="Min. 8 characters"
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          className={styles.submitBtn} 
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Create Coordinator'}
        </button>
      </form>
    </div>
  );
};

export default CreateCoordinatorForm;