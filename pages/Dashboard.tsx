
import React, { useState } from 'react';
import { Users, Briefcase, FileCheck, TrendingUp, ChevronDown, ChevronUp, User, CheckCircle, AlertTriangle, Layers } from 'lucide-react';
import { Job, CandidateInput } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  jobs: Job[];
  candidates: CandidateInput[];
}

const Dashboard: React.FC<DashboardProps> = ({ jobs, candidates }) => {
  // Stats Calculation
  const evaluatedCandidates = candidates.filter(c => c.status === 'success');
  const interviewsScheduled = candidates.filter(c => c.stage === 'InterviewScheduled').length;
  const hiringRate = evaluatedCandidates.length > 0 
    ? Math.round((candidates.filter(c => c.stage === 'FinalReview').length / evaluatedCandidates.length) * 100) 
    : 0;

  const stats = [
    { label: "الوظائف المفتوحة", value: jobs.filter(j => j.status === 'Open').length, icon: Briefcase, color: "bg-blue-500" },
    { label: "إجمالي المرشحين", value: candidates.length, icon: Users, color: "bg-indigo-500" },
    { label: "مقابلات مجدولة", value: interviewsScheduled, icon: FileCheck, color: "bg-purple-500" },
    { label: "معدل القبول (نهائي)", value: `${hiringRate}%`, icon: TrendingUp, color: "bg-emerald-500" },
  ];

  const chartData = [
    { name: 'يناير', candidates: 40 },
    { name: 'فبراير', candidates: 30 },
    { name: 'مارس', candidates: 20 },
    { name: 'أبريل', candidates: 27 },
    { name: 'مايو', candidates: 18 },
    { name: 'يونيو', candidates: 23 },
    { name: 'يوليو', candidates: 34 },
  ];

  // Group candidates by Job for the new view
  const candidatesByJob: Record<string, CandidateInput[]> = {};
  evaluatedCandidates.forEach(cand => {
    const jobKey = cand.jobId || 'unknown';
    if (!candidatesByJob[jobKey]) {
      candidatesByJob[jobKey] = [];
    }
    candidatesByJob[jobKey].push(cand);
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">نظرة عامة</h2>
        <p className="text-slate-500 mt-1">مرحباً بك في لوحة تحكم الموارد البشرية</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <h4 className="text-2xl font-bold text-slate-800">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">أحدث الوظائف</h3>
            <button className="text-sm text-blue-600 font-medium hover:underline">عرض الكل</button>
          </div>
          <div className="space-y-4">
            {jobs.slice(0, 3).map(job => (
              <div key={job.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <h4 className="font-bold text-slate-800">{job.title}</h4>
                  <p className="text-xs text-slate-500">{job.department}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-lg font-medium ${job.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {job.status === 'Open' ? 'مفتوح' : 'مغلق'}
                </span>
              </div>
            ))}
            {jobs.length === 0 && <p className="text-slate-400 text-center py-4">لا توجد وظائف حالياً</p>}
          </div>
        </div>

        {/* Analytics Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">نشاط التوظيف (شهرياً)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  cursor={{fill: '#f1f5f9'}}
                />
                <Bar dataKey="candidates" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grouped Candidates by Job (New Feature) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
           <div>
             <h3 className="text-lg font-bold text-slate-800">المرشحون المصنفون حسب الوظيفة</h3>
             <p className="text-slate-500 text-sm mt-1">عرض جميع المرشحين الذين تم تقييمهم وتوزيعهم على الوظائف.</p>
           </div>
           <Layers className="text-slate-300 w-6 h-6" />
        </div>
        
        <div className="divide-y divide-slate-100">
           {Object.keys(candidatesByJob).length === 0 ? (
             <div className="p-8 text-center text-slate-400">لا يوجد مرشحين تم تقييمهم بعد.</div>
           ) : (
             Object.keys(candidatesByJob).map(jobId => {
               // Find job details
               const job = jobs.find(j => j.id === jobId);
               const groupCandidates = candidatesByJob[jobId];
               const jobTitle = job ? job.title : (jobId === 'unknown' ? 'غير مصنف' : 'وظيفة محذوفة');
               
               return (
                 <JobGroupAccordion 
                    key={jobId} 
                    title={jobTitle} 
                    count={groupCandidates.length} 
                    candidates={groupCandidates} 
                 />
               );
             })
           )}
        </div>
      </div>
    </div>
  );
};

// Component for the Job Group Accordion
const JobGroupAccordion: React.FC<{ title: string, count: number, candidates: CandidateInput[] }> = ({ title, count, candidates }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white">
       <button 
         onClick={() => setIsOpen(!isOpen)}
         className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
       >
         <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
               <Briefcase className="w-5 h-5" />
            </div>
            <div className="text-right">
               <h4 className={`font-bold ${isOpen ? 'text-blue-700' : 'text-slate-800'}`}>{title}</h4>
               <p className="text-xs text-slate-500">{count} مرشح</p>
            </div>
         </div>
         <div className="text-slate-400">
            {isOpen ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
         </div>
       </button>
       
       {isOpen && (
         <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 space-y-2">
            {candidates.map(candidate => (
               <DashboardCandidateRow key={candidate.id} candidate={candidate} />
            ))}
         </div>
       )}
    </div>
  );
};

const DashboardCandidateRow: React.FC<{ candidate: CandidateInput }> = ({ candidate }) => {
  const [expanded, setExpanded] = useState(false);
  const result = candidate.result;

  if (!result) return null;

  const scoreColor = 
    result.matchScore >= 85 ? 'text-green-600' :
    result.matchScore >= 70 ? 'text-blue-600' :
    result.matchScore >= 50 ? 'text-orange-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
       <div 
         className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer"
         onClick={() => setExpanded(!expanded)}
       >
          <div className="flex items-center gap-4">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-indigo-50 text-indigo-600 border border-indigo-100`}>
                {result.candidateName.charAt(0)}
             </div>
             <div>
                <h4 className="font-bold text-slate-800 text-sm">{result.candidateName}</h4>
                <div className="flex gap-2 text-xs mt-1">
                  <span className={`px-2 py-0.5 rounded font-bold ${candidate.stage === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {candidate.stage}
                  </span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
             <div className="text-center min-w-[60px]">
                <span className={`text-lg font-black ${scoreColor}`}>{result.matchScore}%</span>
             </div>
             <button className="text-slate-400 hover:text-slate-600">
                {expanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
             </button>
          </div>
       </div>

       {expanded && (
         <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 bg-white/50">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
               <p className="text-slate-700 leading-relaxed">{result.summary}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-xs">
               <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-green-800">
                  <strong>نقاط القوة:</strong> {result.strengths.slice(0, 3).join('، ')}
               </div>
               <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-800">
                  <strong>نقاط الضعف:</strong> {result.weaknesses.slice(0, 3).join('، ')}
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default Dashboard;
