import { useState } from "react";
import { Copy, Check, Terminal, Shield, ArrowUpRight, Zap, Code } from "lucide-react";

export function EndpointCard() {
  const [copied, setCopied] = useState(false);
  const [activeSnippetTab, setActiveSnippetTab] = useState<"curl" | "fetch" | "python">("curl");

  const productionUrl = "http://localhost:3000/answerQuestion";
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : productionUrl.replace("/answerQuestion", "");
  const endpointUrl = `${currentOrigin}/answerQuestion`;

  const handleCopy = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curlSnippet = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "question": "What is your years of software engineering experience?",
    "model": "gemini-3.7-flash",
    "context": {
      "type": "text",
      "data": "Resume: Jane Doe, 7 years Senior Full Stack Engineer specializing in TypeScript and Cloud Run."
    },
    "systemInstruction": "Answer concisely in first-person as the applicant."
  }'`;

  const fetchSnippet = `const res = await fetch("${endpointUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    question: "What is your highest level of education?",
    model: "gemini-3.7-flash", // or gemini-3.6-flash, gemini-3.5-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite
    context: {
      type: "text",
      data: "Candidate graduated with M.S. in Computer Science from Stanford University in 2020."
    },
    systemInstruction: "Answer concisely."
  })
});

const { answer, model } = await res.json();
console.log(\`[\${model}] Answer:\`, answer);`;

  const pythonSnippet = `import requests

url = "${endpointUrl}"
headers = {
    "Content-Type": "application/json"
}
payload = {
    "question": "Summarize relevant skills",
    "model": "gemini-3.7-flash",
    "context": {
        "type": "text",
        "data": "Over 5 years building React, Node.js, and Google Cloud services."
    },
    "systemInstruction": "Answer directly for a form input."
}

response = requests.post(url, json=payload, headers=headers)
print(response.json().get("answer"))`;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              POST
            </span>
            <h2 className="text-slate-100 font-semibold text-base font-mono">/answerQuestion</h2>
            <span className="text-xs text-slate-400">Local Server Endpoint</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Server-side Gemini 3.7 Flash API integration with text grounding and native PDF understanding.
          </p>
        </div>

        {/* Copy Endpoint Bar */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 max-w-full overflow-hidden">
          <code className="text-xs font-mono text-blue-300 px-2 truncate max-w-[280px] sm:max-w-md">
            {endpointUrl}
          </code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-medium transition shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy URL"}</span>
          </button>
        </div>
      </div>

      {/* Grid: Request Schema & Code Snippets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Schema Spec */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Endpoint Specifications</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 font-mono">
              <div className="text-slate-400 text-[11px] font-sans">Request Body Structure (JSON):</div>
              <div className="text-slate-300">
                <span className="text-amber-400 font-semibold">question</span>: <span className="text-blue-400">string</span> <span className="text-red-400 text-[10px]">*required</span>
              </div>
              <div className="text-slate-300">
                <span className="text-amber-400 font-semibold">model</span>: <span className="text-blue-400">string</span> | <span className="text-slate-500">null</span> <span className="text-slate-500 text-[10px]">(optional: 3.7, 3.6, 3.5, 3.1, 3.0)</span>
              </div>
              <div className="text-slate-300">
                <span className="text-amber-400 font-semibold">context</span>: {"{"}
                <div className="pl-4 text-slate-300">
                  <span className="text-amber-300">type</span>: <span className="text-purple-400">"text"</span> | <span className="text-purple-400">"pdf"</span>,
                </div>
                <div className="pl-4 text-slate-300">
                  <span className="text-amber-300">data</span>: <span className="text-blue-400">string</span> (page text or base64 PDF),
                </div>
                <div className="pl-4 text-slate-300">
                  <span className="text-amber-300">mimeType?</span>: <span className="text-blue-400">"application/pdf"</span>
                </div>
                {"}"} | <span className="text-slate-500">null</span> <span className="text-slate-500 text-[10px]">(optional)</span>
              </div>
              <div className="text-slate-300">
                <span className="text-amber-400 font-semibold">systemInstruction</span>: <span className="text-blue-400">string</span> | <span className="text-slate-500">null</span> <span className="text-slate-500 text-[10px]">(optional)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 font-mono">
              <div className="text-slate-400 text-[11px] font-sans">Response (200 OK):</div>
              <div className="text-emerald-300 font-semibold">
                {"{ \"answer\": \"Gemini generated response...\" }"}
              </div>
            </div>
          </div>
        </div>

        {/* Code Snippets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Code className="w-4 h-4 text-blue-400" />
              <span>Example Invocations</span>
            </div>
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setActiveSnippetTab("curl")}
                className={`px-2.5 py-1 rounded font-mono ${
                  activeSnippetTab === "curl" ? "bg-slate-800 text-blue-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveSnippetTab("fetch")}
                className={`px-2.5 py-1 rounded font-mono ${
                  activeSnippetTab === "fetch" ? "bg-slate-800 text-blue-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Fetch
              </button>
              <button
                onClick={() => setActiveSnippetTab("python")}
                className={`px-2.5 py-1 rounded font-mono ${
                  activeSnippetTab === "python" ? "bg-slate-800 text-blue-300 font-semibold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Python
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[190px]">
              {activeSnippetTab === "curl" && curlSnippet}
              {activeSnippetTab === "fetch" && fetchSnippet}
              {activeSnippetTab === "python" && pythonSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
