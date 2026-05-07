import { useEffect, useState } from 'react';
import ProfessorForm from '../../components/ProfessorForm';
import { PageHeader, Card } from '../../components/ui';
import apiClient from '../../utils/apiClient';

function ProfessorsPage() {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProfessors = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users/search', { params: { role: 'Professor', limit: 100 } });
      const data = res.data?.data ?? res.data ?? [];
      setProfessors(Array.isArray(data) ? data : []);
    } catch {
      setProfessors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfessors(); }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-1">
      <PageHeader title="Professors" subtitle="Manage professor accounts" />

      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Create Professor</p>
        <ProfessorForm onSuccess={loadProfessors} />
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Professor List</p>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : professors.length === 0 ? (
          <p className="text-sm text-slate-500">No professors found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-[#1e293b]">
                <th className="pb-2 font-semibold uppercase tracking-wider">Email</th>
                <th className="pb-2 font-semibold uppercase tracking-wider">Name</th>
                <th className="pb-2 font-semibold uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {professors.map((p) => (
                <tr key={p._id ?? p.id ?? p.email}>
                  <td className="py-2.5 text-slate-300">{p.email}</td>
                  <td className="py-2.5 text-slate-400">{p.name ?? '—'}</td>
                  <td className="py-2.5 text-slate-400">{p.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export default ProfessorsPage;
