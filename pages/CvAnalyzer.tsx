
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileText, CheckCircle, XCircle, Loader2, Trash2, Plus, Users, MessageSquare, ChevronDown, ChevronUp, Upload, FileSpreadsheet, Send, Settings, Mail, Calendar, AlertTriangle, History, HelpCircle, User, FileWarning, Printer, CalendarClock, Ban, ExternalLink, Sparkles, Wifi, Search, Link, Briefcase, FileCheck, X, Save, Phone, Paperclip, BellRing, Info, MapPin, ArrowRightLeft } from 'lucide-react';
import { Job, CandidateInput, MessageTemplate, CandidateStage, LogEntry, AnalysisResult } from '../types';
import { analyzeCV } from '../services/geminiService';
import * as XLSX from 'xlsx';
import emailjs from '@emailjs/browser';

// --- EMAILJS CONFIGURATION ---
const SERVICE_ID = 'service_javm3vg'; 
const TEMPLATE_ID = 'template_05nssha'; 
const PUBLIC_KEY = 'X5ZVIKf7MmPv5JnMi'; 

// --- STAGE LABELS MAPPING ---
const STAGE_LABELS: Record<string, string> = {
  'New': 'جديد',
  'InterviewWait': 'مطلوب للمقابلة',
  'InterviewScheduled': 'مقابلة مجدولة',
  'FinalReview': 'مراجعة نهائية',
  'Rejected': 'مرفوض'
};

// --- TOAST NOTIFICATION COMPONENT ---
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000); 
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-fade-in-down border ${type === 'success' ? 'bg-green-600 border-green-700 text-white' : 'bg-red-600 border-red-700 text-white'}`}>
      {type === 'success' ? <CheckCircle className="w-6 h-6 animate-pulse" /> : <AlertTriangle className="w-6 h-6" />}
      <div>
        <h4 className="font-bold text-sm">{type === 'success' ? 'تمت العملية بنجاح' : 'تنبيه'}</h4>
        <p className="text-xs opacity-90">{message}</p>
      </div>
      <button onClick={onClose} className="mr-4 text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
    </div>
  );
};

// --- HELPER TRANSLATION FUNCTION ---
const translateRecommendation = (rec: string): string => {
  const map: Record<string, string> = {
    'Highly Recommended': 'موصى به بشدة',
    'Recommended': 'موصى به',
    'Consider': 'يستحق النظر',
    'Not Recommended': 'غير موصى به'
  };
  return map[rec] || rec;
};

// --- HELPER COMPONENTS ---

const ActionBtn: React.FC<{ icon: any, label: string, onClick: () => void, color: string }> = ({ icon: Icon, label, onClick, color }) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-${color}-50 text-${color}-600`}>
    <Icon className="w-4 h-4" /> {label}
  </button>
);

const CandidateCard: React.FC<{
  candidate: CandidateInput;
  index: number;
  onUpdateFile: (id: string, type: 'cv' | 'form', file: File | null) => void;
  onRemove: (id: string) => void;
  onAction: (id: string, action: MessageTemplate['type']) => void;
  onDownloadPDF: (c: CandidateInput) => void;
  onManualStageChange: (id: string, newStage: CandidateStage) => void;
  job?: Job;
  autoExpand?: boolean;
}> = ({ candidate, index, onUpdateFile, onRemove, onAction, onDownloadPDF, onManualStageChange, job, autoExpand }) => {
  const [isExpanded, setIsExpanded] = useState(autoExpand || false);
  const [manualStage, setManualStage] = useState<CandidateStage>(candidate.stage);

  // Update local manual stage if candidate prop changes
  useEffect(() => {
    setManualStage(candidate.stage);
  }, [candidate.stage]);

  const result = candidate.result;
  
  // Logic for Identity Mismatch
  const isMismatch = result?.identityMismatch === true;
  
  const scoreColor = 
    isMismatch ? 'text-red-600' :
    result && result.matchScore >= 85 ? 'text-green-600' :
    result && result.matchScore >= 70 ? 'text-blue-600' :
    result && result.matchScore >= 50 ? 'text-orange-600' : 'text-red-600';
  
  const statusColor = 
    isMismatch ? 'border-l-4 border-l-red-600 bg-red-50/10' :
    candidate.status === 'success' ? 'border-l-4 border-l-green-500' :
    candidate.status === 'error' ? 'border-l-4 border-l-red-500' :
    candidate.status === 'analyzing' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-slate-300';

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 transition-all ${statusColor} ${isExpanded ? 'shadow-md ring-1 ring-blue-100' : ''}`}>
      <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Info & Files */}
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
            {index + 1}
          </div>
          
          <div className="flex-1">
             <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-800 text-lg">
                  {result?.candidateName || candidate.name}
                </h3>
                {candidate.stage !== 'New' && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
                    {STAGE_LABELS[candidate.stage] || candidate.stage}
                  </span>
                )}
             </div>
             
             <div className="flex flex-wrap gap-2 text-xs">
                {candidate.cvFile ? (
                  <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                    <CheckCircle className="w-3 h-3" /> CV: {candidate.cvFile.name.substring(0, 15)}...
                  </span>
                ) : (
                  <label className="cursor-pointer flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <Upload className="w-3 h-3" /> {candidate.status === 'success' ? 'تم تحليل الـ CV' : 'رفع السيرة الذاتية'}
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && onUpdateFile(candidate.id, 'cv', e.target.files[0])} />
                  </label>
                )}

                {candidate.appFormFile ? (
                  <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                    <CheckCircle className="w-3 h-3" /> Form: {candidate.appFormFile.name.substring(0, 15)}...
                  </span>
                ) : (
                  <label className="cursor-pointer flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <FileSpreadsheet className="w-3 h-3" /> {candidate.status === 'success' && !candidate.appFormFile ? 'لا يوجد استمارة' : 'رفع الاستمارة'}
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && onUpdateFile(candidate.id, 'form', e.target.files[0])} />
                  </label>
                )}
             </div>
          </div>
        </div>

        {/* Center: Status / Job / Suitable Field */}
        <div className="flex items-center gap-4">
           {/* Added Suitable Field Block */}
           {result?.suitableField && (
             <div className="text-right hidden xl:block pl-4 border-l border-slate-100">
               <p className="text-xs text-slate-400">التخصص الملائم</p>
               <p className="text-sm font-bold text-indigo-900">{result.suitableField}</p>
             </div>
           )}

           {job && (
             <div className="text-right hidden lg:block">
               <p className="text-xs text-slate-400">الوظيفة المرشحة</p>
               <p className="text-sm font-bold text-blue-900">{job.title}</p>
             </div>
           )}

           {candidate.status === 'analyzing' && (
             <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg animate-pulse">
               <Loader2 className="w-4 h-4 animate-spin" />
               <span className="text-sm font-bold">جاري التحليل...</span>
             </div>
           )}

           {candidate.status === 'error' && (
             <div className="text-red-500 text-xs flex items-center gap-1 bg-red-50 px-3 py-2 rounded-lg max-w-[200px] leading-tight font-bold">
               <XCircle className="w-4 h-4 shrink-0" />
               {candidate.errorMessage || 'خطأ'}
             </div>
           )}

           {candidate.status === 'success' && result && (
             <div className="text-center bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 relative">
               {isMismatch ? (
                 <div className="flex items-center gap-1 text-red-600 font-bold px-2">
                   <AlertTriangle className="w-6 h-6 animate-pulse" />
                   <div className="text-sm">عدم تطابق</div>
                 </div>
               ) : (
                 <>
                   <div className={`text-xl font-black ${scoreColor}`}>
                     {result.matchScore}%
                   </div>
                   <div className="text-[10px] text-slate-500 font-bold">{translateRecommendation(result.recommendation)}</div>
                 </>
               )}
             </div>
           )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsExpanded(!isExpanded)}
             className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
           >
             {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
           </button>
           <button 
             onClick={() => onRemove(candidate.id)}
             className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
           >
             <Trash2 className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6">
          {candidate.status === 'success' && result ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* Identity Mismatch Alert */}
               {isMismatch && (
                 <div className="lg:col-span-3 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm flex items-start gap-3">
                   <Ban className="w-6 h-6 mt-0.5 shrink-0" />
                   <div>
                     <h3 className="font-bold text-lg">تحذير: عدم تطابق هوية المرشح</h3>
                     <p className="text-sm mt-1">{result.identityMismatchReason || "يبدو أن السيرة الذاتية والاستمارة تخصان شخصين مختلفين. يرجى التحقق من الملفات المرفقة."}</p>
                   </div>
                 </div>
               )}

               {/* Analysis Details */}
               <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500"/> الرأي المهني (المخلص)</h4>
                    <p className="text-slate-700 text-sm leading-relaxed font-medium">{result.summary}</p>
                    {/* Suitable field in expanded view as well */}
                    {result.suitableField && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">المجال الأنسب للمرشح:</span>
                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{result.suitableField}</span>
                        </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4"/> نقاط القوة</h4>
                        <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                          {result.strengths?.map((s, i) => <li key={i}>{s}</li>) || <li>لا توجد بيانات</li>}
                        </ul>
                     </div>
                     <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> نقاط الضعف / الملاحظات</h4>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                          {result.weaknesses?.map((w, i) => <li key={i}>{w}</li>) || <li>لا توجد بيانات</li>}
                        </ul>
                     </div>
                  </div>

                  {result.interviewQuestions && result.interviewQuestions.length > 0 && (
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-indigo-500"/> أسئلة مقترحة للمقابلة</h4>
                        <ul className="list-decimal list-inside text-sm text-slate-600 space-y-1">
                          {result.interviewQuestions.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                     </div>
                  )}
               </div>

               {/* Actions Panel */}
               <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <h4 className="font-bold text-slate-800 mb-3 text-sm">بيانات التواصل</h4>
                     <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span>{candidate.manualContact?.email || result.contactInfo?.email || 'غير متوفر'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span dir="ltr">{candidate.manualContact?.phone || result.contactInfo?.phone || 'غير متوفر'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Sparkles className="w-4 h-4 text-slate-400" />
                          <span>{result.educationLevel || 'المؤهل غير محدد'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{result.currentLocation || 'الموقع غير محدد'}</span>
                        </div>
                     </div>
                  </div>

                  {/* Automated Workflow Actions */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <h4 className="font-bold text-slate-800 mb-3 text-sm">إجراءات التواصل</h4>
                     <div className="grid grid-cols-1 gap-2">
                        <ActionBtn icon={MessageSquare} label="إرسال رسالة أولية" onClick={() => onAction(candidate.id, 'initial')} color="blue" />
                        <ActionBtn icon={Calendar} label="تحديد موعد مقابلة" onClick={() => onAction(candidate.id, 'interview')} color="indigo" />
                        <ActionBtn icon={CheckCircle} label="قبول مبدئي (طلب هوية)" onClick={() => onAction(candidate.id, 'offer_id_request')} color="green" />
                        <ActionBtn icon={FileText} label="إرسال العرض الوظيفي" onClick={() => onAction(candidate.id, 'offer_review')} color="emerald" />
                        <ActionBtn icon={XCircle} label="اعتذار (رفض)" onClick={() => onAction(candidate.id, 'rejection')} color="red" />
                     </div>
                  </div>

                  {/* Manual Stage Control */}
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
                     <h4 className="font-bold text-orange-800 mb-3 text-sm flex items-center gap-2"><ArrowRightLeft className="w-4 h-4"/> التحكم اليدوي بالمرحلة</h4>
                     <div className="flex gap-2">
                        <select 
                          value={manualStage} 
                          onChange={(e) => setManualStage(e.target.value as CandidateStage)}
                          className="flex-1 text-xs border border-orange-200 rounded-lg px-2 py-2 outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                        >
                          {Object.entries(STAGE_LABELS).map(([key, label]) => (
                             <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => onManualStageChange(candidate.id, manualStage)}
                          className="bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-700"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                  
                  <button 
                    onClick={() => onDownloadPDF(candidate)}
                    className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-700"
                  >
                    <Printer className="w-4 h-4" /> طباعة التقرير
                  </button>
               </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
               {candidate.status === 'idle' ? ((candidate.cvFile || candidate.appFormFile) ? 'الملفات جاهزة للتحليل. اضغط زر تحليل الملفات لبدء التقييم.' : 'ارفع السيرة الذاتية أو الاستمارة للبدء.') : candidate.status === 'analyzing' ? 'جاري تحليل الملف...' : 'حدث خطأ في التحليل'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const TemplateEditorModal: React.FC<{
  templates: MessageTemplate[];
  onSave: (templates: MessageTemplate[]) => void;
  onClose: () => void;
}> = ({ templates, onSave, onClose }) => {
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const [localTemplates, setLocalTemplates] = useState(templates);
  
  const activeTemplate = localTemplates.find(t => t.id === selectedId) || localTemplates[0];

  const handleUpdate = (field: 'subject' | 'body', value: string) => {
    setLocalTemplates(prev => prev.map(t => t.id === selectedId ? { ...t, [field]: value } : t));
  };

  const handleSave = () => {
    onSave(localTemplates);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5" /> إدارة قوالب الرسائل</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
           {/* Sidebar */}
           <div className="w-64 bg-slate-50 border-l border-slate-200 overflow-y-auto p-2 space-y-1">
             {localTemplates.map(t => (
               <button
                 key={t.id}
                 onClick={() => setSelectedId(t.id)}
                 className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTemplate.id === t.id ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-slate-600 hover:bg-slate-200'}`}
               >
                 {t.name}
               </button>
             ))}
           </div>

           {/* Editor */}
           <div className="flex-1 p-6 overflow-y-auto space-y-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">عنوان الرسالة (Subject)</label>
                <input 
                  value={activeTemplate.subject} 
                  onChange={(e) => handleUpdate('subject', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
             </div>
             <div className="flex-1 flex flex-col">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">نص الرسالة (Body)</label>
                <textarea 
                  value={activeTemplate.body} 
                  onChange={(e) => handleUpdate('body', e.target.value)}
                  className="w-full h-64 px-4 py-3 border border-slate-300 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
             </div>
             <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                <span className="font-bold">المتغيرات المتاحة:</span> {activeTemplate.variables.join(', ')}
             </div>
           </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
           <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">إلغاء</button>
           <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200">حفظ التعديلات</button>
        </div>
      </div>
    </div>
  );
};


const CommunicationModal: React.FC<{
  candidate: CandidateInput;
  actionType: MessageTemplate['type'];
  job: Job | null | undefined;
  templates: MessageTemplate[];
  onClose: () => void;
  onLog: (candidateId: string, actionType: string, channel: 'WhatsApp' | 'Email') => void;
  onMoveStage: (candidateId: string, actionType: MessageTemplate['type']) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
  onUpdateContact: (id: string, email: string, phone: string) => void;
}> = ({ candidate, actionType, job, templates, onClose, onLog, onMoveStage, onShowToast, onUpdateContact }) => {
  const template = templates.find(t => t.type === actionType) || templates[0];
  
  const [email, setEmail] = useState(candidate.manualContact?.email || candidate.result?.contactInfo?.email || '');
  const [phone, setPhone] = useState(candidate.manualContact?.phone || candidate.result?.contactInfo?.phone || '');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [location, setLocation] = useState(job?.location || '');
  const [offerFile, setOfferFile] = useState<File | null>(null);

  // Status tracking
  const [waSent, setWaSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Force show schedule fields if the action implies scheduling (interview or reschedule)
  const needsScheduling = actionType === 'interview' || actionType === 'reschedule';
  // Show file input ONLY for offer review
  const needsAttachment = actionType === 'offer_review';

  const [interviewDate, setInterviewDate] = useState(''); // yyyy-mm-dd
  const [interviewTime, setInterviewTime] = useState(''); // HH:mm

  // Auto-set date to tomorrow if scheduling is needed
  useEffect(() => {
    if (needsScheduling && !interviewDate) {
      const tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      setInterviewDate(tmr.toISOString().split('T')[0]);
      setInterviewTime('10:00');
    }
  }, [needsScheduling, interviewDate]);

  // AUTO-ADVANCE EFFECT
  useEffect(() => {
    if (waSent && emailSent) {
        const timer = setTimeout(() => {
            onShowToast("تم إتمام القناتين: يتم النقل للمرحلة التالية تلقائياً...", "success");
            onMoveStage(candidate.id, actionType);
            onClose();
        }, 1200); 
        return () => clearTimeout(timer);
    }
  }, [waSent, emailSent, candidate.id, actionType, onMoveStage, onClose, onShowToast]);

  // Helper to replace variables
  const processText = (text: string) => {
    const formattedDate = interviewDate || '---';
    const formattedTime = interviewTime || '---';
    let processed = text
      .replace(/{name}/g, candidate.result?.candidateName || candidate.name)
      .replace(/{job_title}/g, job?.title || 'الوظيفة')
      .replace(/{location}/g, location || 'المقر الرئيسي')
      .replace(/{interview_date}/g, formattedDate)
      .replace(/{interview_time}/g, formattedTime)
      .replace(/{form_link}/g, 'https://forms.gle/xyz'); // Placeholder
    return processed;
  };

  const subject = processText(template.subject);
  const body = processText(template.body);

  const handleSendWhatsApp = () => {
    if (!phone) { onShowToast("يرجى إدخال رقم الجوال", "error"); return; }

    // Cleaning the phone number:
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('05')) {
      cleanPhone = '966' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
      cleanPhone = '966' + cleanPhone;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
    
    // Log only - Do not close
    onUpdateContact(candidate.id, email, phone);
    onLog(candidate.id, actionType, 'WhatsApp');
    setWaSent(true);
    onShowToast("تم فتح واتساب وتسجيل العملية", "success");
  };

  const handleSendEmail = async () => {
    if (!email) { onShowToast("يرجى إدخال البريد الإلكتروني", "error"); return; }
    
    setIsSendingEmail(true);
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          to_email: email,
          to_name: candidate.result?.candidateName || candidate.name,
          subject: subject,
          message: body,
          job_title: job?.title || ''
        },
        PUBLIC_KEY
      );
      
      // Log only - Do not close
      onUpdateContact(candidate.id, email, phone);
      onLog(candidate.id, actionType, 'Email');
      setEmailSent(true);
      onShowToast("تم إرسال البريد الإلكتروني بنجاح", "success");
    } catch (error) {
      console.error(error);
      onShowToast("فشل إرسال البريد الإلكتروني", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCompleteAndMove = () => {
     onMoveStage(candidate.id, actionType);
     onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">تواصل مع المرشح</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-3">
             <label className="block text-xs font-bold text-slate-500">بيانات الاتصال</label>
             <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                   <Mail className="w-4 h-4 absolute top-3 right-3 text-slate-400"/>
                   <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dir-ltr" />
                </div>
                <div className="relative">
                   <Phone className="w-4 h-4 absolute top-3 right-3 text-slate-400"/>
                   <input
                     value={phone}
                     onChange={(e) => setPhone(e.target.value)}
                     placeholder="رقم الجوال (مثال: 05xxxxxxxx)"
                     className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dir-ltr"
                   />
                </div>
             </div>
          </div>

          {/* Date & Time Section */}
          {needsScheduling && (
             <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <label className="block text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1">
                   <CalendarClock className="w-4 h-4" />
                   تحديد الموعد (مطلوب للرسالة)
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                   <div>
                     <label className="block text-[10px] text-indigo-500 mb-1">التاريخ</label>
                     <input 
                       type="date" 
                       value={interviewDate} 
                       onChange={(e) => setInterviewDate(e.target.value)}
                       className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white" 
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] text-indigo-500 mb-1">الوقت</label>
                     <input 
                       type="time" 
                       value={interviewTime} 
                       onChange={(e) => setInterviewTime(e.target.value)}
                       className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white" 
                     />
                   </div>
                </div>
                <div>
                   <label className="block text-[10px] text-indigo-500 mb-1">الموقع</label>
                   <input
                     value={location}
                     onChange={(e) => setLocation(e.target.value)}
                     placeholder="المكان (مثال: مقر الشركة)"
                     className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                   />
                </div>
             </div>
          )}

          {/* File Attachment */}
          {needsAttachment && (
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <label className="block text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1">
                   <Paperclip className="w-4 h-4" />
                   إرفاق العرض الوظيفي (PDF)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => e.target.files && setOfferFile(e.target.files[0])}
                    className="block w-full text-sm text-emerald-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer"
                  />
                </div>
                {offerFile && (
                  <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> تم إرفاق: {offerFile.name}
                  </p>
                )}
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
             <p className="text-xs font-bold text-slate-500 mb-2">معاينة الرسالة ({template.name})</p>
             <div className="text-sm font-bold text-slate-800 mb-1">{subject}</div>
             <div className="text-sm text-slate-600 whitespace-pre-line">{body}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={handleSendWhatsApp}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${waSent ? 'bg-green-100 border-green-400 text-green-800' : 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100'}`}
            >
              {waSent ? <CheckCircle className="w-6 h-6" /> : <Send className="w-6 h-6" />}
              <span className="font-bold text-sm">{waSent ? 'تم الإرسال' : 'إرسال واتساب'}</span>
            </button>
            <button 
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all disabled:opacity-50 ${emailSent ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100'}`}
            >
              {isSendingEmail ? <Loader2 className="w-6 h-6 animate-spin" /> : emailSent ? <CheckCircle className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
              <span className="font-bold text-sm">{emailSent ? 'تم الإرسال' : 'إرسال إيميل'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
           <button 
              onClick={handleCompleteAndMove}
              className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg flex items-center justify-center gap-2"
           >
              <CheckCircle className="w-5 h-5" />
              نقل يدوي للمرحلة التالية (دون انتظار)
           </button>
        </div>
      </div>
    </div>
  );
};

interface CvAnalyzerProps {
  jobs: Job[];
  candidates: CandidateInput[];
  setCandidates: React.Dispatch<React.SetStateAction<CandidateInput[]>>;
  onCandidateUpdate?: (candidate: CandidateInput) => void;
  onCandidateAdd?: (candidate: CandidateInput) => Promise<string>;
  onCandidateDelete?: (id: string) => void;
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 't1',
    name: 'طلب تعبئة استمارة',
    type: 'initial',
    subject: 'طلب استكمال بيانات التوظيف - {job_title}',
    body: `مرحباً {name}،\n\nشكراً لاهتمامك بالانضمام لفريقنا في وظيفة {job_title}. لقد اطلعنا على سيرتك الذاتية ونود الانتقال للخطوة التالية.\n\nيرجى تعبئة استمارة التوظيف عبر الرابط التالي:\n{form_link}\n\nنتطلع لاستلام ردك قريباً.\n\nتحياتنا،\nفريق الموارد البشرية`,
    variables: ['{name}', '{job_title}', '{form_link}']
  },
  {
    id: 't2',
    name: 'تحديد موعد مقابلة',
    type: 'interview',
    subject: 'دعوة لمقابلة شخصية - {job_title}',
    body: `مرحباً {name}،\n\nيسرنا دعوتك لإجراء مقابلة شخصية لوظيفة {job_title}.\n\nالتفاصيل:\nالتاريخ: {interview_date}\nالوقت: {interview_time}\nالمكان: {location}\n\nيرجى تأكيد الحضور.\n\nتحياتنا،\nفريق التوظيف`,
    variables: ['{name}', '{job_title}', '{interview_date}', '{interview_time}', '{location}']
  },
  {
    id: 't3',
    name: 'اعتذار للمرشح',
    type: 'rejection',
    subject: 'تحديث بخصوص طلب التوظيف - {job_title}',
    body: `عزيزي/عزيزتي {name}،\n\nنشكرك على وقتك واهتمامك بالعمل معنا في وظيفة {job_title}.\n\nبعد مراجعة دقيقة، نود إبلاغك بأننا قررنا المضي قدماً مع مرشحين آخرين تتناسب خبراتهم بشكل أكبر مع متطلبات الوظيفة الحالية.\n\nنتمنى لك كل التوفيق في مسيرتك المهنية.\n\nتحياتنا،\nفريق الموارد البشرية`,
    variables: ['{name}', '{job_title}']
  },
  {
    id: 't4',
    name: 'تغيير موعد المقابلة',
    type: 'reschedule',
    subject: 'تحديث موعد المقابلة الشخصية - {job_title}',
    body: `مرحباً {name}،\n\nنود إبلاغك بأنه قد تم تغيير موعد المقابلة الشخصية لوظيفة {job_title}.\n\nالموعد الجديد:\nالتاريخ: {interview_date}\nالوقت: {interview_time}\nالمكان: {location}\n\nنعتذر عن أي إزعاج ونأمل أن يكون الموعد الجديد مناسباً لكم.\n\nتحياتنا،\nفريق التوظيف`,
    variables: ['{name}', '{job_title}', '{interview_date}', '{interview_time}', '{location}']
  },
  {
    id: 't5',
    name: 'إلغاء المقابلة',
    type: 'cancellation',
    subject: 'إلغاء المقابلة الشخصية - {job_title}',
    body: `مرحباً {name}،\n\nنأسف لإبلاغك بأنه قد تم إلغاء المقابلة الشخصية المجدولة لوظيفة {job_title} لأسباب إدارية.\n\nسنقوم بالتواصل معك لاحقاً في حال تم تحديد موعد آخر أو توفرت فرص جديدة.\n\nنقدر تفهمك.\n\nتحياتنا،\nفريق التوظيف`,
    variables: ['{name}', '{job_title}']
  },
  {
    id: 't6',
    name: 'قبول مبدئي وطلب هوية',
    type: 'offer_id_request',
    subject: 'تهنئة بالقبول المبدئي - {job_title}',
    body: `مرحباً {name}،\n\nيسعدنا إبلاغك باجتيازك للمقابلة الشخصية لوظيفة {job_title} بنجاح.\n\nلإستكمال إجراءات إعداد العرض الوظيفي، يرجى تزويدنا بصورة واضحة من الهوية الوطنية (أو الإقامة) في أقرب وقت ممكن.\n\nتحياتنا،\nفريق الموارد البشرية`,
    variables: ['{name}', '{job_title}']
  },
  {
    id: 't7',
    name: 'إرسال عرض عمل (48 ساعة)',
    type: 'offer_review',
    subject: 'عرض وظيفي - {job_title}',
    body: `عزيزي/عزيزتي {name}،\n\nيسرنا أن نقدم لك هذا العرض الوظيفي للانضمام لفريقنا في وظيفة {job_title}.\n\nيرجى الاطلاع على العرض المرفق، والرد علينا بالموافقة أو الرفض خلال 48 ساعة من تاريخ هذه الرسالة.\n\nنتطلع لانضمامك إلينا.\n\nتحياتنا،\nفريق الموارد البشرية`,
    variables: ['{name}', '{job_title}']
  },
  {
    id: 't8',
    name: 'طلب استكمال ملف موظف',
    type: 'complete_file',
    subject: 'استكمال مسوغات التعيين - {job_title}',
    body: `مرحباً {name}،\n\nنرحب بك مجدداً في فريقنا.\n\nلإتمام إجراءات التعيين وفتح الملف الوظيفي، يرجى تزويدنا بالمستندات الناقصة (الشهادات الأكاديمية، شهادات الخبرة، الآيبان البنكي).\n\nيرجى إرسالها في أقرب وقت.\n\nتحياتنا،\nفريق الموارد البشرية`,
    variables: ['{name}', '{job_title}']
  }
];

const CvAnalyzer: React.FC<CvAnalyzerProps> = ({ jobs, candidates, setCandidates, onCandidateUpdate, onCandidateAdd, onCandidateDelete }) => {
  const [selectedJobId, setSelectedJobId] = useState<string>('auto-match');
  const [activeTab, setActiveTab] = useState<CandidateStage | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [commModal, setCommModal] = useState<{
    isOpen: boolean;
    candidateId: string | null;
    actionType: 'initial' | 'interview' | 'rejection' | 'reschedule' | 'cancellation' | 'offer_id_request' | 'offer_review' | 'complete_file' | null;
  }>({ isOpen: false, candidateId: null, actionType: null });

  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  
  const cvInputRef = useRef<HTMLInputElement>(null);
  const formsInputRef = useRef<HTMLInputElement>(null);
  const excelImportRef = useRef<HTMLInputElement>(null);

  const isEmailConfigured = SERVICE_ID && PUBLIC_KEY && (SERVICE_ID as string) !== 'YOUR_SERVICE_ID';

  const showToast = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  const addCandidateSlot = () => {
    setSearchQuery('');
    setActiveTab('New');
    // For manual addition, we don't save to DB yet until they upload a file or do something
    // We use a temporary timestamp ID
    setCandidates([
      ...candidates,
      { id: Date.now().toString(), name: `المرشح ${candidates.length + 1}`, cvFile: null, appFormFile: null, status: 'idle', stage: 'New', logs: [] }
    ]);
  };

  const removeCandidateSlot = (id: string) => {
    setCandidates(candidates.filter(c => c.id !== id));
    if (onCandidateDelete) onCandidateDelete(id);
  };

  const updateCandidateFile = (id: string, type: 'cv' | 'form', file: File | null) => {
    setCandidates(candidates.map(c => {
      if (c.id === id) {
        return type === 'cv' ? { ...c, cvFile: file, name: file ? file.name.split('.')[0] : c.name, status: 'idle' as const, result: undefined, errorMessage: undefined } : { ...c, appFormFile: file, status: 'idle' as const, result: undefined, errorMessage: undefined };
      }
      return c;
    }));
  };

  const updateCandidateContact = async (id: string, email: string, phone: string) => {
    let updatedCandidate: CandidateInput | undefined;
    setCandidates(candidates.map(c => {
      if (c.id === id) {
        updatedCandidate = { ...c, manualContact: { email, phone } };
        return updatedCandidate;
      }
      return c;
    }));

    if (updatedCandidate && onCandidateUpdate) {
      onCandidateUpdate(updatedCandidate);
    }
  };

  // --- SMART BATCH LOGIC ---
  const handleBatchCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const cvFiles = Array.from(e.target.files) as File[];
      
      setCandidates(prev => {
        const next = [...prev];
        if (next.length === 1 && !next[0].cvFile && !next[0].appFormFile) next.pop();

        let fileIndex = 0;
        
        for (let i = 0; i < next.length && fileIndex < cvFiles.length; i++) {
          if (!next[i].cvFile) {
            next[i] = { 
              ...next[i], 
              cvFile: cvFiles[fileIndex],
              name: cvFiles[fileIndex].name.split('.')[0], status: 'idle', result: undefined, errorMessage: undefined
            };
            fileIndex++;
          }
        }

        while (fileIndex < cvFiles.length) {
          const file = cvFiles[fileIndex];
          next.push({ id: `${Date.now()}-cv-${fileIndex}`, name: file.name.split('.')[0], cvFile: file, appFormFile: null, status: 'idle', stage: 'New', logs: [] });
          fileIndex++;
        }
        return next;
      });
      e.target.value = '';
    }
  };

  const handleBatchFormUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const formFiles = Array.from(e.target.files) as File[];
      
      setCandidates(prev => {
        const next = [...prev];
        if (next.length === 1 && !next[0].cvFile && !next[0].appFormFile) next.pop();

        let fileIndex = 0;

        for (let i = 0; i < next.length && fileIndex < formFiles.length; i++) {
          if (!next[i].appFormFile) {
            next[i] = { ...next[i], appFormFile: formFiles[fileIndex], status: 'idle', result: undefined, errorMessage: undefined };
            fileIndex++;
          }
        }

        while (fileIndex < formFiles.length) {
          const file = formFiles[fileIndex];
          next.push({ id: `${Date.now()}-form-${fileIndex}`, name: file.name.split('.')[0], cvFile: null, appFormFile: file, status: 'idle', stage: 'New', logs: [] });
          fileIndex++;
        }
        return next;
      });
      e.target.value = '';
    }
  };

  const handleImportGoogleForms = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (jsonData.length < 2) { showToast("الملف فارغ أو غير صالح", "error"); return; }
        const headers = (jsonData[0] as string[]).map(h => h.trim().toLowerCase());
        const rows = jsonData.slice(1);
        let nameIdx = headers.findIndex(h => h.includes('name') || h.includes('اسم'));
        let emailIdx = headers.findIndex(h => h.includes('email') || h.includes('بريد'));
        let phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('جوال'));
        let cvIdx = headers.findIndex(h => h.includes('cv') || h.includes('سيرة') || h.includes('link'));
        const newCandidates: CandidateInput[] = rows.map((row, index) => {
          let rowContent = `Imported Row ${index}:\n`;
          headers.forEach((h, i) => rowContent += `${h}: ${row[i]}\n`);
          const virtualFile = new File([rowContent], `Form_${index}.txt`, { type: 'text/plain' });
          return {
            id: `${Date.now()}-gf-${index}`,
            name: nameIdx !== -1 ? row[nameIdx] : `Candidate ${index}`,
            cvFile: null,
            appFormFile: virtualFile,
            externalCvLink: cvIdx !== -1 ? row[cvIdx] : '',
            manualContact: { email: emailIdx !== -1 ? row[emailIdx] : '', phone: phoneIdx !== -1 ? row[phoneIdx] : '' },
            status: 'idle',
            stage: 'New',
            logs: []
          };
        });
        setCandidates(prev => [...prev, ...newCandidates]);
        showToast(`تم استيراد ${newCandidates.length} مرشح بنجاح`, "success");
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleBatchAnalyze = async () => {
    if (!selectedJobId) return;
    const validCandidates = candidates.filter(c => c.cvFile !== null || c.appFormFile !== null);
    if (validCandidates.length === 0) return;
    setIsProcessingBatch(true);
    let analysisContext: string | Job[] = "";
    let isAutoMatch = false;
    if (selectedJobId === 'auto-match') {
      const openJobs = jobs.filter(j => j.status === 'Open');
      analysisContext = openJobs;
      isAutoMatch = true;
    } else {
      const job = jobs.find(j => j.id === selectedJobId);
      if (job) analysisContext = `Job: ${job.title}\nDesc: ${job.description}\nRequirements: ${job.requirements}`;
      else { setIsProcessingBatch(false); return; }
    }

    const newCandidates = [...candidates];
    let completedCount = 0;
    let failedCount = 0;
    let saveFailureCount = 0;
    for (let i = 0; i < newCandidates.length; i++) {
      const cand = newCandidates[i];
      if ((cand.cvFile || cand.appFormFile) && cand.status !== 'success') {
        newCandidates[i] = { ...cand, status: 'analyzing' };
        setCandidates([...newCandidates]);
        try {
          const result = await analyzeCV(cand.cvFile, cand.appFormFile, analysisContext);
          if (result.isCvOrApplication === false) {
             failedCount++;
             newCandidates[i] = { ...cand, status: 'error', errorMessage: `الملف غير صالح` };
          } else {
             let assignedJobId = selectedJobId;
             let assignedJobTitle = "";
             if (isAutoMatch && result.bestFitJobId) {
               const matchedJob = jobs.find(j => j.id === result.bestFitJobId);
               assignedJobId = matchedJob ? matchedJob.id : selectedJobId;
               assignedJobTitle = matchedJob ? matchedJob.title : "وظيفة غير محددة";
             } else {
               const job = jobs.find(j => j.id === selectedJobId);
               assignedJobId = job ? job.id : "";
               assignedJobTitle = job ? job.title : "";
             }
             
             // Success - Create the updated candidate object
             const updatedCand = { ...cand, status: 'success' as const, result, jobId: assignedJobId, jobTitle: assignedJobTitle };
             newCandidates[i] = updatedCand;
             completedCount++;
             // Persist independently: database failures must not erase AI results.
             try {
               if (onCandidateAdd && (!cand.id || cand.id.includes('-') || cand.id.length < 20)) {
                 const realId = await onCandidateAdd(updatedCand);
                 newCandidates[i] = { ...updatedCand, id: realId };
               } else if (onCandidateUpdate) {
                 await onCandidateUpdate(updatedCand);
               }
             } catch (saveError) {
               console.error('Candidate analysis completed but database saving failed:', saveError);
               saveFailureCount++;
             }
          }
        } catch (error: any) {
          console.error("Analysis failed:", error);
          
          let errorMsg = 'فشل التحليل';
          const errString = error?.message || JSON.stringify(error) || String(error);

          // Detect common API errors
          if (errString.includes('leaked') || errString.includes('reported as leaked') || errString.includes('PERMISSION_DENIED')) {
            errorMsg = 'المفتاح محظور (تم تسريبه). يجب استخراج مفتاح جديد من Google AI Studio.';
          } else if (errString.includes('API key') || errString.includes('API_KEY')) {
            errorMsg = 'مفتاح API غير صالح أو مفقود';
          } else if (errString.includes('quota') || errString.includes('429')) {
             errorMsg = 'انتهى رصيد الاستخدام (Quota Exceeded)';
          } else if (errString.includes('413')) {
             errorMsg = 'حجم الملفات أكبر من الحد المسموح. يرجى ضغط الملفات.';
          } else if (/[\u0600-\u06FF]/.test(errString)) {
             errorMsg = errString;
          } else if (errString.includes('network') || errString.includes('fetch')) {
             errorMsg = 'خطأ في الاتصال بالشبكة';
          }

          failedCount++;
          newCandidates[i] = { ...cand, status: 'error', errorMessage: errorMsg };
        }
        setCandidates([...newCandidates]);
      }
    }
    setIsProcessingBatch(false);
    if (saveFailureCount > 0) {
      showToast('اكتمل تحليل ' + completedCount + ' ملف، لكن تعذر حفظ ' + saveFailureCount + ' نتيجة. راجع اتصال قاعدة البيانات.', 'error');
    } else if (failedCount > 0) {
      showToast('نجح تحليل ' + completedCount + ' ملف وتعذر تحليل ' + failedCount + ' ملف. راجع السبب لكل مرشح.', 'error');
    } else {
      showToast('تم تحليل ' + completedCount + ' ملف بنجاح.', 'success');
    }
  };

  const handleActionClick = (candidateId: string, action: any) => {
    setCommModal({ isOpen: true, candidateId, actionType: action });
  };

  // Only logs the action, does NOT change stage
  const logCandidateAction = async (candidateId: string, actionType: string, channel: 'WhatsApp' | 'Email') => {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) return;

      const logEntry: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action: `Sent ${actionType}`,
        details: `Channel: ${channel}`,
        channel: channel,
        stageBefore: candidate.stage,
        stageAfter: candidate.stage // No change
      };

      const updatedCandidate = { ...candidate, logs: [logEntry, ...candidate.logs] };

      setCandidates(candidates.map(c => 
        c.id === candidateId ? updatedCandidate : c
      ));

      if (onCandidateUpdate) {
        await onCandidateUpdate(updatedCandidate);
      }
  };

  // Changes stage (used by Manual Move or Complete button)
  const changeCandidateStage = async (candidateId: string, newStage: CandidateStage) => {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) return;
      if (candidate.stage === newStage) return;

      const logEntry: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action: 'Stage Updated',
        details: `Manual/Workflow Update`,
        channel: 'System',
        stageBefore: candidate.stage,
        stageAfter: newStage
      };

      const updatedCandidate = { ...candidate, stage: newStage, logs: [logEntry, ...candidate.logs] };

      setCandidates(candidates.map(c => 
        c.id === candidateId ? updatedCandidate : c
      ));

      if (onCandidateUpdate) {
        await onCandidateUpdate(updatedCandidate);
      }
      showToast(`تم تغيير المرحلة إلى: ${STAGE_LABELS[newStage]}`, "success");
  };

  // Determines next stage based on action type (for the "Complete" button)
  const completeActionAndMove = async (candidateId: string, actionType: string) => {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) return;

      let nextStage: CandidateStage = candidate.stage;
      
      if (actionType === 'initial') nextStage = 'InterviewWait';
      else if (actionType === 'interview') nextStage = 'InterviewScheduled';
      else if (actionType === 'rejection') nextStage = 'Rejected';
      else if (actionType === 'reschedule') nextStage = 'InterviewScheduled';
      else if (actionType === 'cancellation') nextStage = 'InterviewWait';
      else if (actionType === 'offer_id_request') nextStage = 'FinalReview';
      else if (actionType === 'offer_review') nextStage = 'FinalReview';
      else if (actionType === 'complete_file') nextStage = 'FinalReview';

      await changeCandidateStage(candidateId, nextStage);
  };

  const exportResultsToExcel = () => {
    const analyzed = candidates.filter(c => c.status === 'success' && c.result);
    if (analyzed.length === 0) return;
    const BOM = "\uFEFF"; 
    let csvContent = "اسم المرشح,رقم الهاتف,البريد الإلكتروني,المرحلة الحالية,نسبة التطابق,التوصية,الوظيفة المرشحة\n";
    analyzed.forEach(c => {
      const r = c.result!;
      const contact = c.manualContact || r.contactInfo;
      const clean = (text: string) => `"${text.replace(/"/g, '""')}"`;
      csvContent += `${clean(r.candidateName)},${contact?.phone || ''},${contact?.email || ''},${c.stage},${r.matchScore}%,${translateRecommendation(r.recommendation)},${clean(c.jobTitle || '')}\n`;
    });
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Candidates_Workflow_${selectedJobId || 'All'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("تم تصدير ملف الإكسل بنجاح", "success");
  };

  // --- NEW SMART EXCEL EXPORT (FILTERS) ---
  const handleSmartExcelExport = () => {
    const analyzed = candidates.filter(c => c.status === 'success' && c.result);
    if (analyzed.length === 0) {
      showToast("يرجى تحليل المرشحين أولاً قبل توليد التقرير", "error");
      return;
    }

    const rows = analyzed.map(c => {
      const r = c.result as AnalysisResult;
      const contact = c.manualContact || r.contactInfo;
      
      // 1. Data Normalization
      const city = (r.currentLocation || '').toLowerCase().trim();
      const degree = (r.educationLevel || '').toLowerCase().trim();
      
      // 2. Logic Filters
      const isLocationValid = ['jeddah', 'makkah', 'jed', 'mak', 'جدة', 'مكة', 'مكه'].some(v => city.includes(v));
      const isDegreeValid = ['bachelor', 'master', 'phd', 'doctor', 'بكالوريوس', 'ماجستير', 'دكتوراه', 'جامعي', 'b.sc', 'bsc', 'ba', 'mba'].some(v => degree.includes(v));

      // 3. Status Determination
      let status = "مناسب"; // Default
      let notes = r.summary; // Use the AI-generated professional summary as the primary note

      if (!isLocationValid) {
        status = "غير مناسب";
        notes = `خارج النطاق الجغرافي (يقيم في: ${r.currentLocation || 'غير محدد'})`;
      } else if (!isDegreeValid) {
        status = "غير مناسب";
        notes = `المؤهل العلمي أقل من المطلوب (المؤهل: ${r.educationLevel || 'غير محدد'})`;
      } else {
         // If hard filters pass, rely on the AI's professional judgment
         // Updated to handle Arabic recommendations
         if (r.recommendation === 'Not Recommended' || r.recommendation === 'غير موصى به') {
           status = "غير مناسب";
           // notes remains r.summary which explains WHY
         } else if (r.recommendation === 'Consider' || r.recommendation === 'يستحق النظر') {
           status = "مناسب جزئياً";
           // notes remains r.summary
         } else {
           status = "مناسب";
           // notes remains r.summary
         }
      }

      return {
        "الاسم": r.candidateName,
        "الوظيفة المناسبة": c.jobTitle || "غير محدد",
        "المجال المقترح": r.suitableField || "عام",
        "المؤهل": r.educationLevel || "غير محدد",
        "المدينة": r.currentLocation || "غير محدد",
        "رقم الجوال": contact?.phone || "",
        "الايميل": contact?.email || "",
        "ملاحظات دقيقة": notes,
        "الحالة": status
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Smart Analysis");
    XLSX.writeFile(workbook, `Smart_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
    
    showToast("تم توليد تقرير الإكسل الذكي بنجاح", "success");
  };

  const handleDownloadPDF = (candidate: CandidateInput) => {
    if (!candidate.result) return;
    const { candidateName, matchScore, recommendation, summary, strengths, weaknesses, interviewQuestions, suitableField } = candidate.result;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>تقرير تقييم المرشح - ${candidateName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
          <style>body { font-family: 'Tajawal', sans-serif; padding: 40px; color: #333; } .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; } .score-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; display: flex; justify-content: space-around; align-items: center; margin-bottom: 30px; } .score-item { text-align: center; } .score-val { font-weight: bold; font-size: 1.2rem; color: #1e293b; margin-bottom: 5px; } .section { margin-bottom: 25px; } .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 20px; }</style>
        </head>
        <body>
          <div class="header"><h1>تقرير تقييم المرشح</h1><p>وظيفة: ${candidate.jobTitle || 'غير محدد'}</p></div>
          <div class="score-card">
             <div class="score-item"><div class="score-val">${candidateName}</div><div>الاسم</div></div>
             <div class="score-item"><div class="score-val">${matchScore}%</div><div>نسبة التطابق</div></div>
             <div class="score-item"><div class="score-val">${translateRecommendation(recommendation)}</div><div>التوصية</div></div>
          </div>
          ${suitableField ? `<div class="section"><h3>المجال الملائم</h3><p>${suitableField}</p></div>` : ''}
          <div class="section"><h3>الملخص المهني</h3><p>${summary}</p></div>
          <div class="section"><h3>نقاط القوة</h3><ul>${(strengths || []).map(s => `<li>${s}</li>`).join('')}</ul></div>
          <div class="section"><h3>نقاط الضعف</h3><ul>${(weaknesses || []).map(w => `<li>${w}</li>`).join('')}</ul></div>
          <div class="section"><h3>أسئلة المقابلة</h3><ul>${(interviewQuestions || []).map(q => `<li>${q}</li>`).join('')}</ul></div>
          <div class="footer">NADER HR Systems</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredCandidates = candidates.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (c.result?.candidateName || c.name).toLowerCase();
      const email = (c.manualContact?.email || c.result?.contactInfo?.email || '').toLowerCase();
      const phone = (c.manualContact?.phone || c.result?.contactInfo?.phone || '');
      const job = (c.jobTitle || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || job.includes(q);
    }
    return activeTab === 'All' || c.stage === activeTab;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      {/* Toast Notification */}
      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div><h2 className="text-3xl font-bold text-slate-800">تحليل المرشحين</h2></div>
        <div className="flex gap-2 items-center w-full md:w-auto">
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isEmailConfigured ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}><Wifi className="w-3 h-3" /> {isEmailConfigured ? 'نظام الإيميل متصل' : 'الإيميل غير مرتبط'}</div>
          <button onClick={() => setIsTemplateModalOpen(true)} className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"><Settings className="w-5 h-5" /> <span>قوالب الرسائل</span></button>
          <div className="flex-1 md:w-80"><select className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none bg-white shadow-md text-blue-900 font-bold transition-all hover:border-blue-400" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}><option value="">-- اختر الوظيفة --</option><option value="auto-match" className="bg-blue-100 text-blue-800 font-bold">✨ تحديد الوظيفة تلقائياً (AI Auto-Match)</option>{jobs.map(job => (<option key={job.id} value={job.id} className="text-slate-800">{job.title}</option>))}</select></div>
        </div>
      </div>

      <div className="relative">
         <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none"><Search className="w-5 h-5 text-blue-500" /></div>
         <input type="text" placeholder="بحث ذكي: (الاسم، الجوال، الإيميل)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-12 py-4 bg-blue-50/50 border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-medium transition-all focus:bg-white"/>
      </div>

      {!searchQuery && (<div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex overflow-x-auto gap-2">{[{id: 'All', label: 'الكل', icon: Users}, {id: 'New', label: 'جديد', icon: FileText}, {id: 'InterviewWait', label: 'مطلوب للمقابلة', icon: HelpCircle}, {id: 'InterviewScheduled', label: 'مقابلات مجدولة', icon: Calendar}, {id: 'FinalReview', label: 'مراجعة نهائية', icon: CheckCircle}, {id: 'Rejected', label: 'مرفوض', icon: XCircle}].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all font-medium ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}><tab.icon className="w-4 h-4" /> {tab.label} <span className={`px-2 py-0.5 rounded text-xs ml-1 ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{tab.id === 'All' ? candidates.length : candidates.filter(c => c.stage === tab.id).length}</span></button>))}</div>)}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 w-full xl:w-auto">
              <input type="file" multiple accept=".pdf,.doc,.docx" ref={cvInputRef} className="hidden" onChange={handleBatchCVUpload}/><input type="file" multiple accept=".pdf,.doc,.docx" ref={formsInputRef} className="hidden" onChange={handleBatchFormUpload}/><input type="file" accept=".xlsx,.csv" ref={excelImportRef} className="hidden" onChange={handleImportGoogleForms}/>
              <button onClick={() => cvInputRef.current?.click()} className="px-5 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-all flex items-center gap-2 font-bold whitespace-nowrap border border-blue-200"><Upload className="w-5 h-5" /> <span>رفع السير الذاتية (Batch CVs)</span></button>
              <button onClick={() => formsInputRef.current?.click()} className="px-5 py-3 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl transition-all flex items-center gap-2 font-bold whitespace-nowrap border border-purple-200"><FileSpreadsheet className="w-5 h-5" /> <span>رفع الاستمارات (Batch Forms)</span></button>
              <button onClick={() => excelImportRef.current?.click()} className="px-5 py-3 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl transition-all flex items-center gap-2 font-bold whitespace-nowrap border border-green-200"><FileSpreadsheet className="w-5 h-5" /> <span>استيراد Google Forms</span></button>
              <button onClick={addCandidateSlot} className="px-5 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 flex items-center gap-2 font-medium whitespace-nowrap bg-white"><Plus className="w-5 h-5" /> <span>إضافة يدوية</span></button>
          </div>
          <div className="flex gap-3 w-full xl:w-auto">
            {/* NEW BUTTON FOR SMART EXCEL */}
            <button onClick={handleSmartExcelExport} disabled={!candidates.some(c => c.status === 'success')} className="px-5 py-3 bg-green-600 text-white hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50 font-bold whitespace-nowrap shadow-green-200 shadow-lg"><FileSpreadsheet className="w-5 h-5" /> <span>توليد تقرير Excel (تحليل المرشح)</span></button>
            
            <button onClick={exportResultsToExcel} disabled={!candidates.some(c => c.status === 'success')} className="px-5 py-3 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 disabled:opacity-50 font-medium whitespace-nowrap"><FileSpreadsheet className="w-5 h-5" /> <span>تصدير بسيط</span></button>
            <button onClick={handleBatchAnalyze} disabled={!selectedJobId || isProcessingBatch || !candidates.some(c => (c.cvFile || c.appFormFile) && c.status !== 'success')} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center gap-3 shadow-lg shadow-blue-200 whitespace-nowrap">{isProcessingBatch ? <Loader2 className="animate-spin" /> : (selectedJobId === 'auto-match' ? <Sparkles className="w-5 h-5" /> : <Users className="w-5 h-5" />)}<span>{selectedJobId === 'auto-match' ? 'تحليل الملفات (مطابقة تلقائية)' : 'تحليل جميع الملفات'}</span></button>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCandidates.length > 0 ? (filteredCandidates.map((candidate, index) => (
          <CandidateCard 
             key={candidate.id} 
             candidate={candidate} 
             index={index} 
             onUpdateFile={updateCandidateFile} 
             onRemove={removeCandidateSlot} 
             onAction={handleActionClick} 
             onDownloadPDF={handleDownloadPDF}
             onManualStageChange={changeCandidateStage} 
             job={jobs.find(j => j.id === (candidate.jobId || selectedJobId))} 
             autoExpand={!!searchQuery && filteredCandidates.length === 1} 
          />
        ))) : (<div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200"><Users className="w-12 h-12 mx-auto mb-4 opacity-20" /><p>{searchQuery ? `لا توجد نتائج مطابقة` : "لا يوجد مرشحين"}</p></div>)}
      </div>

      {isTemplateModalOpen && <TemplateEditorModal templates={templates} onSave={setTemplates} onClose={() => setIsTemplateModalOpen(false)} />}
      
      {commModal.isOpen && commModal.candidateId && 
        <CommunicationModal 
          candidate={candidates.find(c => c.id === commModal.candidateId)!} 
          actionType={commModal.actionType!} 
          job={jobs.find(j => j.id === (candidates.find(c => c.id === commModal.candidateId)?.jobId || selectedJobId)) || null} 
          templates={templates} 
          onClose={() => setCommModal({ isOpen: false, candidateId: null, actionType: null })} 
          onLog={logCandidateAction}
          onMoveStage={completeActionAndMove}
          onShowToast={showToast}
          onUpdateContact={updateCandidateContact} 
        />
      }
    </div>
  );
};

export default CvAnalyzer;
