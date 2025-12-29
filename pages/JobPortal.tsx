import React, { useState } from 'react';
import { Plus, MapPin, Calendar, Trash2, Edit } from 'lucide-react';
import { Job } from '../types';

interface JobPortalProps {
  jobs: Job[];
  addJob: (job: Job) => void;
  editJob: (job: Job) => void;
  deleteJob: (id: string) => void;
}

const JobPortal: React.FC<JobPortalProps> = ({ jobs, addJob, editJob, deleteJob }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newJob, setNewJob] = useState<Partial<Job>>({
    id: '',
    title: '',
    department: '',
    location: '',
    description: '',
    requirements: '',
    status: 'Open'
  });

  const openAddModal = () => {
    setIsEditing(false);
    setNewJob({ title: '', department: '', location: '', description: '', requirements: '', status: 'Open' });
    setShowModal(true);
  };

  const openEditModal = (job: Job) => {
    setIsEditing(true);
    setNewJob(job);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newJob.title && newJob.description) {
      if (isEditing && newJob.id) {
        editJob(newJob as Job);
      } else {
        addJob({
          id: Date.now().toString(),
          postedDate: new Date().toISOString().split('T')[0],
          ...newJob as Job
        });
      }
      setShowModal(false);
      setNewJob({ title: '', department: '', location: '', description: '', requirements: '', status: 'Open' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">إدارة الوظائف</h2>
          <p className="text-slate-500 mt-1">أضف وظائف جديدة وحدد الشروط والمتطلبات</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة وظيفة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${job.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {job.status === 'Open' ? 'مفتوح للتقديم' : 'مغلق'}
                </span>
                <h3 className="text-xl font-bold text-slate-800 mt-2">{job.title}</h3>
                <p className="text-slate-500 text-sm">{job.department}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openEditModal(job)}
                  className="text-blue-500 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                  title="تعديل"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => deleteJob(job.id)}
                  className="text-red-500 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Calendar className="w-4 h-4" />
                <span>نشر بتاريخ: {job.postedDate}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-600 line-clamp-2">{job.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Job Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-2xl font-bold text-slate-800">{isEditing ? 'تعديل بيانات الوظيفة' : 'تفاصيل الوظيفة الجديدة'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المسمى الوظيفي</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">القسم</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                    value={newJob.department}
                    onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الموقع</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الحالة</label>
                  <select 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                    value={newJob.status}
                    onChange={(e) => setNewJob({ ...newJob, status: e.target.value as 'Open' | 'Closed' })}
                  >
                    <option value="Open">مفتوح للتقديم</option>
                    <option value="Closed">مغلق</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الوصف الوظيفي</label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="اشرح مهام الوظيفة..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الشروط والمتطلبات</label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                  value={newJob.requirements}
                  onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                  placeholder="المؤهلات، الخبرات، المهارات المطلوبة..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
                >
                  {isEditing ? 'حفظ التعديلات' : 'نشر الوظيفة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPortal;