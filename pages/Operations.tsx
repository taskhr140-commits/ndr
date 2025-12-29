
import React, { useState, useRef } from 'react';
import { FileSpreadsheet, FileText, BarChart3, Send, Sparkles, Copy, Check, Download, Calculator, Table, FileCheck, UploadCloud, X } from 'lucide-react';
import { runOperationsAgent } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

type OpMode = 'excel_help' | 'excel_gen' | 'report' | 'doc';

const Operations: React.FC = () => {
  const [mode, setMode] = useState<OpMode>('report');
  const [prompt, setPrompt] = useState('');
  const [contextData, setContextData] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExecute = async () => {
    if (!prompt && !uploadedFile) return;
    setLoading(true);
    setResponse('');
    
    // Remap local mode to service type
    let serviceType: 'excel' | 'report' | 'doc' = 'report';
    if (mode === 'excel_help') serviceType = 'excel';
    if (mode === 'excel_gen') serviceType = 'excel';
    if (mode === 'doc') serviceType = 'doc';

    try {
      let finalPrompt = prompt;
      if (uploadedFile && !prompt) {
        finalPrompt = "قم بتحليل هذا الملف وتحسينه بناءً على نوعه (سواء كان إكسل أو مستند نصي).";
      }
      
      const res = await runOperationsAgent(finalPrompt, contextData, serviceType, uploadedFile || undefined);
      
      // We rely on the service to clean XML for Excel mode.
      // For other modes, we might strip markdown block syntax for cleaner display if needed, 
      // but ReactMarkdown handles that well.
      setResponse(res);
    } catch (e) {
      setResponse("عذراً، حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!response) return;

    let blob: Blob;
    let fileName: string;
    const BOM = "\uFEFF"; 

    if (mode === 'excel_gen') {
      // Save as XML Spreadsheet 2003 (.xls)
      // IMPORTANT: No BOM for XML, as the header <?xml ... ?> defines encoding.
      blob = new Blob([response], { type: 'application/vnd.ms-excel' });
      fileName = `Dynamic_Sheet_${Date.now()}.xls`;
    } else if (mode === 'doc' || mode === 'report') {
      // Treat as HTML/Doc
      const htmlContent = `
        <html dir="rtl">
        <head><meta charset="UTF-8"></head>
        <body style="font-family: 'Arial', sans-serif;">
          ${response.replace(/\n/g, '<br>')}
        </body>
        </html>
      `;
      blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
      fileName = `Smart_Document_${Date.now()}.doc`;
    } else {
        // Excel Help (just text)
        blob = new Blob([BOM + response], { type: 'text/plain;charset=utf-8;' });
        fileName = `Formula_Help_${Date.now()}.txt`;
    }

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-2rem)] flex flex-col">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">مركز العمليات الذكي</h2>
        <p className="text-slate-500 mt-1">مساعدك الشخصي للتقارير، وإنشاء ملفات الإكسل الديناميكية (معادلات وتنسيق)، وتطوير مستنداتك الخاصة.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Control Panel */}
        <div className="lg:col-span-4 space-y-4 flex flex-col h-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => { setMode('report'); setResponse(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${mode === 'report' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <BarChart3 className="w-4 h-4" /> تقارير
            </button>
            <button
              onClick={() => { setMode('doc'); setResponse(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${mode === 'doc' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText className="w-4 h-4" /> مستندات
            </button>
            <button
              onClick={() => { setMode('excel_help'); setResponse(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${mode === 'excel_help' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calculator className="w-4 h-4" /> مساعد المعادلات
            </button>
            <button
              onClick={() => { setMode('excel_gen'); setResponse(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${mode === 'excel_gen' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Table className="w-4 h-4" /> توليد Excel ذكي
            </button>
          </div>

          <div className="space-y-4 flex-1">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
              {mode === 'excel_help' && "أنا هنا لمساعدتك في كتابة المعادلات المعقدة أو الماكرو. فقط صف ما تريد حسابه."}
              {mode === 'excel_gen' && "سأقوم بإنشاء ملف إكسل **تفاعلي** يحتوي على معادلات (IF, SUM) تتغير تلقائياً، مع تنسيقات شرطية وألوان احترافية."}
              {mode === 'report' && "يمكنك رفع تقرير قديم ليقوم الذكاء الاصطناعي بتحليله وإعادة صياغته أو استخراج الأخطاء منه."}
              {mode === 'doc' && "أستطيع كتابة عقود جديدة أو مراجعة عقودك الحالية وتعديلها لتكون أكثر احترافية."}
            </div>

            {/* File Upload Area */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors relative">
              {uploadedFile ? (
                <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-sm text-blue-700 truncate">{uploadedFile.name}</span>
                  </div>
                  <button onClick={() => setUploadedFile(null)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">اضغط لرفع ملف (Word, Excel, PDF) للتحليل أو التعديل</p>
                </div>
              )}
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls,.doc,.docx,.pdf,.txt,.csv" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                تفاصيل الطلب
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  uploadedFile 
                  ? "مثال: حسّن صياغة هذا الملف، أو استخرج البيانات وحولها لإكسل..." 
                  : mode === 'excel_gen' 
                    ? "مثال: أنشئ نموذج تقييم يتغير تلقائياً إذا اخترت 'مدير' أو 'موظف' من القائمة..." 
                    : "اكتب طلبك هنا..."
                }
                className="w-full h-24 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm placeholder:text-slate-400 text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                سياق إضافي (اختياري)
              </label>
              <textarea
                value={contextData}
                onChange={(e) => setContextData(e.target.value)}
                placeholder="بيانات نصية إضافية لمساعدة الذكاء الاصطناعي..."
                className="w-full h-20 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm font-mono bg-slate-50 placeholder:text-slate-400 text-slate-900"
              />
            </div>
          </div>

          <button
            onClick={handleExecute}
            disabled={loading || (!prompt && !uploadedFile)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-medium shadow-lg shadow-blue-200 flex justify-center items-center gap-2 mt-auto"
          >
            {loading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            <span>نفذ الطلب</span>
          </button>
        </div>

        {/* Right Output Panel */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              النتيجة
            </h3>
            <div className="flex items-center gap-2">
              {response && (
                <>
                  <button 
                    onClick={copyToClipboard}
                    className="text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'تم النسخ' : 'نسخ'}
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="text-slate-600 hover:text-green-600 bg-white border border-slate-200 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold"
                  >
                    <Download className="w-4 h-4" />
                    {mode === 'excel_gen' ? 'تحميل ملف Excel (.xls)' : mode === 'excel_help' ? 'حفظ النص' : 'تحميل Word'}
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 p-8 overflow-y-auto bg-white relative">
            {!response && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 pointer-events-none">
                <Sparkles className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium text-slate-400">مساحة العمل فارغة</p>
                <p className="text-sm">ابدأ برفع ملف أو كتابة طلب في القائمة الجانبية</p>
              </div>
            )}
            
            {loading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-32 bg-slate-100 rounded w-full"></div>
              </div>
            )}

            {response && (
              <div className="w-full h-full">
                {mode === 'excel_gen' ? (
                   <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                         <FileCheck className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">تم توليد الملف الذكي بنجاح</h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                           يحتوي الملف على معادلات تفاعلية وتنسيقات. عند فتحه، جرب تغيير القيم (مثل نوع الموظف) لترى النتائج تتغير.
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg text-left text-xs text-slate-400 font-mono w-full max-w-lg overflow-hidden border border-slate-100 mt-4">
                        {response.substring(0, 200)}...
                      </div>
                   </div>
                ) : (
                    <div className="prose prose-slate max-w-none 
                        prose-headings:text-slate-900 prose-headings:font-bold
                        prose-p:text-slate-700 
                        prose-li:text-slate-700
                        prose-strong:text-slate-900
                        prose-a:text-blue-600">
                        <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Operations;
