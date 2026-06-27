import React, { useState } from 'react';
import { BrainCircuit, Upload, Trash2, Loader2, FileText, Copyright, Sparkles, Percent } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const GROQ_API_KEY = "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";

function App() {
  const [activeTab, setActiveTab] = useState('summary');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // New: Progress state
  const [summary, setSummary] = useState('');
  const [quiz, setQuiz] = useState('');
  const [fileName, setFileName] = useState('');

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const typedarray = new Uint8Array(reader.result);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(s => s.str).join(" ") + " ";
        }
        setInputText(text);
      } catch (err) { alert("PDF Read Error: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
  };

  const generateContent = async (mode) => {
    if (!inputText.trim()) return alert("Please upload a PDF first!");
    
    setLoading(true);
    setProgress(0);
    setSummary(''); 
    setQuiz('');
    
    const chunkSize = 2000;
    const chunks = inputText.match(new RegExp('.{1,' + chunkSize + '}', 'g')) || [];
    let tempResult = "";

    try {
      for (let i = 0; i < chunks.length; i++) {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${GROQ_API_KEY}`, 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ 
              role: "user", 
              content: `${mode === 'summary' ? 'Summarize this section:' : 'Generate 2 MCQs from this section:'} ${chunks[i]}` 
            }]
          })
        });

        if (!response.ok) throw new Error(`Chunk ${i + 1} failed.`);

        const data = await response.json();
        tempResult += (data.choices[0]?.message?.content || "") + "\n\n";
        
        // Update progress
        setProgress(Math.round(((i + 1) / chunks.length) * 100));
        
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
      
      if (mode === 'summary') setSummary(tempResult);
      else setQuiz(tempResult);
      setActiveTab(mode);
    } catch (err) { 
      alert("Error: " + err.message); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#020617] to-[#0f172a] text-slate-200 font-sans p-4 md:p-8">
      <header className="max-w-7xl mx-auto pb-8 border-b border-slate-800 flex justify-between items-end">
        <div className="flex items-center gap-4">
          <div className="bg-orange-600 p-3 rounded-2xl shadow-lg shadow-orange-900/20">
            <BrainCircuit className="text-white h-10 w-10" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Guru Groq</h1>
            <div className="flex items-center gap-2 text-xs font-medium text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full mt-1 w-fit border border-orange-500/20">
              <Sparkles size={12} />
              <span>POWERED BY GROQ LLAMA 3.1</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        <section className="lg:col-span-4 bg-slate-900/50 backdrop-blur-lg p-6 rounded-3xl border border-slate-800 shadow-xl">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2"><FileText size={18}/> Input Source</h2>
          <label className="border-2 border-dashed border-slate-700 rounded-2xl p-8 mb-6 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all group">
            <Upload className="h-8 w-8 mb-2 text-slate-500 group-hover:text-orange-500" />
            <span className="text-sm text-slate-400 truncate w-full text-center">{fileName || "Click to upload PDF"}</span>
            <input type="file" className="hidden" accept=".pdf" onChange={handlePdfUpload} />
          </label>
          <textarea 
            className="w-full h-64 bg-slate-950 rounded-2xl p-5 border border-slate-800 focus:border-orange-500 outline-none text-sm text-slate-300" 
            value={inputText} onChange={(e) => setInputText(e.target.value)} 
            placeholder="Document text..."
          />
          <div className="flex gap-3 mt-6">
            <button onClick={() => generateContent('summary')} className="flex-1 bg-slate-800 py-3 rounded-xl font-bold hover:bg-slate-700 transition">Summary</button>
            <button onClick={() => generateContent('quiz')} className="flex-1 bg-orange-600 py-3 rounded-xl font-bold hover:bg-orange-700 transition">Quiz</button>
            <button onClick={() => { setInputText(''); setSummary(''); setQuiz(''); setFileName(''); setProgress(0); }} className="px-4 bg-red-900/20 text-red-400 rounded-xl hover:bg-red-900/40 transition"><Trash2 size={20}/></button>
          </div>
        </section>

        <section className="lg:col-span-8 bg-slate-900/50 backdrop-blur-lg p-8 rounded-3xl border border-slate-800 shadow-xl min-h-[600px]">
          <div className="flex gap-8 border-b border-slate-800 mb-8">
            <button onClick={() => setActiveTab('summary')} className={`pb-4 font-bold ${activeTab === 'summary' ? 'text-white border-b-2 border-orange-500' : 'text-slate-500'}`}>Study Summary</button>
            <button onClick={() => setActiveTab('quiz')} className={`pb-4 font-bold ${activeTab === 'quiz' ? 'text-white border-b-2 border-orange-500' : 'text-slate-500'}`}>Quiz Room</button>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96">
              <Loader2 className="animate-spin h-12 w-12 text-orange-500 mb-4" />
              <div className="w-64 bg-slate-800 rounded-full h-2.5 mb-2">
                <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-sm text-slate-400 font-mono">Processing: {progress}% Complete</p>
            </div>
          ) : (
            <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">
              {activeTab === 'summary' ? (summary || "Summary will appear here.") : (quiz || "Quiz will appear here.")}
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 py-8 border-t border-slate-900 text-center">
        <p className="flex justify-center items-center gap-2 text-xs text-slate-600">
          <Copyright size={14} /> 2026 YehanIT Solutions | Advanced AI Learning Assistant
        </p>
      </footer>
    </div>
  );
}
export default App;