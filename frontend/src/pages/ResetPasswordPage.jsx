import { useNavigate } from 'react-router-dom';
import { ResetPasswordForm } from '../components/ResetPasswordForm';

export function ResetPasswordPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/login');
  };

  return <ResetPasswordForm onSuccess={handleSuccess} />;
}
