import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Inbox, Activity } from 'lucide-react';
import { Card, Button } from '../ui';

const metrics = [
  { icon: Users,    label: 'Global Students',  value: '254', sub: '+12% this semester', iconColor: 'text-blue-400' },
  { icon: BookOpen, label: 'Active Projects',   value: '42',  sub: 'Stable',             iconColor: 'text-green-400' },
  { icon: Inbox,    label: 'System Requests',   value: '18',  sub: 'High volume',        iconColor: 'text-yellow-400' },
  { icon: Activity, label: 'Platform Health',   value: '99.9%', sub: 'Optimal',          iconColor: 'text-slate-300' },
];

const CoordinatorView = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="flex items-center gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ${m.iconColor}`}>
              <m.icon size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{m.label}</p>
              <p className="mt-0.5 text-lg font-bold text-slate-100">{m.value}</p>
              <p className="text-[11px] text-slate-600">{m.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <p className="mb-1 text-sm font-bold text-slate-200">Administrative Quick Actions</p>
        <p className="mb-4 text-sm text-slate-500">
          Manage system-wide audit logs, adjust global configurations, and oversee all academic departments.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="md">Download Reports</Button>
          <Button variant="ghost" size="md" onClick={() => navigate('/admin/activity')}>
            System Logs
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CoordinatorView;
