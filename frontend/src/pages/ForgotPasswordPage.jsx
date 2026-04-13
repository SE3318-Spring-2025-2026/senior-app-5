import { useNavigate } from 'react-router-dom';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/login');
  };

  return <ForgotPasswordForm onSuccess={handleSuccess} />;
}
