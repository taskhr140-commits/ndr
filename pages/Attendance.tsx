import React, { useState } from 'react';
import { UploadCloud, Clock, AlertTriangle, CheckCircle, FileDown, Loader2, Calendar } from 'lucide-react';
import { analyzeAttendance } from '../services/geminiService';

const Attendance: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeAttendance(file);
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء معالجة الملف. يرجى التأكد من الصيغة والمحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!result) return;
    
    // Header
    let csv = "التاريخ,وقت الدخول,وقت الخروج,مدة التأخير,مدة الخروج المبكر,الحالة,الإجراء المقترح\n";
    
    // Rows
    result.records.forEach((row: any) => {
      csv += `${row.date},${row.checkIn},${row.checkOut},${row.lateDuration},${row.earlyDuration},${row.status},${row.action}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">إدارة الحضور والانصراف</h2>
        <p className="text-slate-500 mt-1">معالجة آلية لسجلات الدوام وتطبيق لوائح التأخير</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="max-w-xl mx-auto">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10" />
          </div>
          
          <h3 className="text-xl font-bold text-slate-800 mb-2">رفع ملف الحضور (Excel / CSV)</h3>
          <p className="text-slate-500 mb-8">
            سيقوم النظام بقراءة الملف، دمج التواريخ والأوقات، وحساب ساعات التأخير والخروج المبكر تلقائياً بناءً على اللوائح (7:30 - 15:30).
          </p>

          <div className="flex flex-col items-center gap-4">
            <label className="w-full flex flex-col items-center px-4 py-6 bg-white text-slate-500 rounded-xl shadow-sm tracking-wide border-2 border-dashed border-blue-200 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all">
              <UploadCloud className="w-8 h-8 mb-2 text-blue-500" />
              <span className="mt-2 text-sm font-medium">{file ? file.name : "اختر ملف الحضور"}</span>
              <input type='file' className="hidden" onChange={handleFileChange} accept=".xlsx,.xls,.csv" />
            </label>

            <button
              onClick={processFile}
              disabled={!file || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري تحليل البيانات...
                </>
              ) : (
                "بدء المعالجة والتحليل"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-slide-up">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border-b-4 border-red-500 shadow-sm">
              <p className="text-slate-500 text-sm font-medium mb-1">إجمالي ساعات التأخير</p>
              <h4 className="text-3xl font-bold text-slate-800 dir-ltr text-right">{result.summary.totalLateDuration}</h4>
            </div>
            <div className="bg-white p-6 rounded-2xl border-b-4 border-yellow-500 shadow-sm">
              <p className="text-slate-500 text-sm font-medium mb-1">إجمالي الخروج المبكر</p>
              <h4 className="text-3xl font-bold text-slate-800 dir-ltr text-right">{result.summary.totalEarlyLeaveDuration}</h4>
            </div>
            <div className="bg-white p-6 rounded-2xl border-b-4 border-slate-800 shadow-sm">
              <p className="text-slate-500 text-sm font-medium mb-1">المجموع الكلي للمخالفات</p>
              <h4 className="text-3xl font-bold text-slate-800 dir-ltr text-right">{result.summary.grandTotalDuration}</h4>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                سجل الحضور التفصيلي
              </h3>
              <button 
                onClick={downloadCSV}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors"
              >
                <FileDown className="w-5 h-5" />
                تصدير Excel
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-600 text-sm">
                  <tr>
                    <th className="px-6 py-4 font-bold">التاريخ</th>
                    <th className="px-6 py-4 font-bold">دخول</th>
                    <th className="px-6 py-4 font-bold">خروج</th>
                    <th className="px-6 py-4 font-bold">تأخير</th>
                    <th className="px-6 py-4 font-bold">مبكر</th>
                    <th className="px-6 py-4 font-bold">الحالة</th>
                    <th className="px-6 py-4 font-bold">الإجراء المقترح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {result.records.map((row: any, idx: number) => {
                    // Color Logic based on returned severity
                    let rowClass = "hover:bg-slate-50";
                    let statusClass = "bg-slate-100 text-slate-600";
                    
                    if (row.severity === 'red') {
                      rowClass = "bg-red-50 hover:bg-red-100";
                      statusClass = "bg-red-100 text-red-700 border border-red-200";
                    } else if (row.severity === 'yellow') {
                      rowClass = "bg-yellow-50 hover:bg-yellow-100";
                      statusClass = "bg-yellow-100 text-yellow-700 border border-yellow-200";
                    } else {
                      statusClass = "bg-green-100 text-green-700 border border-green-200";
                    }

                    return (
                      <tr key={idx} className={`transition-colors ${rowClass}`}>
                        <td className="px-6 py-4 font-medium text-slate-800">{row.date}</td>
                        <td className="px-6 py-4 dir-ltr text-right">{row.checkIn}</td>
                        <td className="px-6 py-4 dir-ltr text-right">{row.checkOut}</td>
                        <td className="px-6 py-4 text-red-600 font-bold dir-ltr text-right">
                          {row.lateDuration !== '00:00' ? row.lateDuration : '-'}
                        </td>
                        <td className="px-6 py-4 text-yellow-600 font-bold dir-ltr text-right">
                          {row.earlyDuration !== '00:00' ? row.earlyDuration : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {row.action}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;