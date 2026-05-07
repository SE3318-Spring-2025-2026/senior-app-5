import { Users, GraduationCap } from 'lucide-react';
import { Card, Badge, Button } from '../ui';

const groups = [
  { id: 1, name: 'Project Alpha', members: 4, progress: 85 },
  { id: 2, name: 'Project Beta',  members: 5, progress: 40 },
  { id: 3, name: 'Project Gamma', members: 3, progress: 10 },
];

const ProfessorView = ({ user }) => {
  const totalStudents = groups.reduce((s, g) => s + g.members, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-blue-400">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Assigned Groups</p>
            <p className="mt-0.5 text-lg font-bold text-slate-100">{groups.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-green-400">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Supervised Students</p>
            <p className="mt-0.5 text-lg font-bold text-slate-100">{totalStudents}</p>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e293b]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Current Group Progress</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#080f1f]">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Group</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Members</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Progress</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-t border-[#1e293b] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-200">{g.name}</td>
                  <td className="px-4 py-3 text-slate-400">{g.members}</td>
                  <td className="px-4 py-3">
                    <Badge color={g.progress >= 70 ? 'green' : g.progress >= 40 ? 'yellow' : 'red'}>
                      {g.progress}%
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm">Review</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ProfessorView;
