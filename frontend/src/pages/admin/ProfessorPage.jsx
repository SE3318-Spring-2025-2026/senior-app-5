import { useEffect, useState } from 'react';
import ProfessorForm from '../../components/ProfessorForm';
import { PageHeader, Card } from '../../components/ui';
import apiClient from '../../utils/apiClient';

function ProfessorsPage() {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Role-fix search state
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [fixing, setFixing] = useState(false);
  const [fixMsg, setFixMsg] = useState('');

  const loadProfessors = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users/search', {
        params: { field: 'role', value: 'Professor', limit: 100 },
      });
      const data = res.data?.data ?? res.data ?? [];
      setProfessors(Array.isArray(data) ? data : []);
    } catch {
      setProfessors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfessors(); }, []);

  const handleSearchUser = async (e) => {
    e.preventDefault();
    setFoundUser(null);
    setSearchError('');
    setFixMsg('');
    try {
      const res = await apiClient.get('/users/search', {
        params: { field: 'email', value: searchEmail.trim(), limit: 1 },
      });
      const data = res.data?.data ?? res.data ?? [];
      const users = Array.isArray(data) ? data : [];
      if (users.length === 0) {
        setSearchError('No user found with that email.');
      } else {
        setFoundUser(users[0]);
      }
    } catch {
      setSearchError('Search failed. Check the email and try again.');
    }
  };

  const handleFixRole = async () => {
    if (!foundUser) return;
    setFixing(true);
    setFixMsg('');
    try {
      const userId = foundUser._id ?? foundUser.id;
      await apiClient.patch(`/admin/users/${userId}/role`, { role: 'Professor' });
      setFixMsg(`✓ Role updated to Professor for ${foundUser.email}`);
      setFoundUser(prev => ({ ...prev, role: 'Professor' }));
      loadProfessors();
    } catch (err) {
      setFixMsg(err?.response?.data?.message ?? 'Failed to update role.');
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-1">
      <PageHeader title="Professor Management" subtitle="Create and manage professor accounts" />

      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Create Professor</p>
        <ProfessorForm onSuccess={loadProfessors} />
      </Card>

      {/* Role Fix Tool */}
      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Fix User Role</p>
        <p className="text-xs text-slate-400 mb-3">
          If a professor cannot approve requests (403 error), their role may be set incorrectly.
          Search by email and set their role to Professor.
        </p>
        <form onSubmit={handleSearchUser} className="flex gap-2 mb-3">
          <input
            type="email"
            placeholder="professor@example.com"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="flex-1 bg-[#1e293b] text-slate-200 text-sm px-3 py-2 rounded border border-[#334155] focus:outline-none focus:border-blue-500"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Search
          </button>
        </form>
        {searchError && <p className="text-xs text-red-400 mb-2">{searchError}</p>}
        {foundUser && (
          <div className="flex items-center justify-between bg-[#1e293b] rounded px-3 py-2 text-sm">
            <span className="text-slate-300">{foundUser.email}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${foundUser.role === 'Professor' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
              {foundUser.role}
            </span>
            {foundUser.role !== 'Professor' && (
              <button
                onClick={handleFixRole}
                disabled={fixing}
                className="ml-3 px-3 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
              >
                {fixing ? 'Fixing…' : 'Set as Professor'}
              </button>
            )}
          </div>
        )}
        {fixMsg && <p className="text-xs mt-2 text-slate-300">{fixMsg}</p>}
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
                <th className="pb-2 font-semibold uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {professors.map((p) => (
                <tr key={p._id ?? p.id ?? p.email}>
                  <td className="py-2.5 text-slate-300">{p.email}</td>
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

