interface LatexViewerProps {
  latexContent: string;
}

export default function LatexViewer({ latexContent }: LatexViewerProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
        <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
          LaTeX Content
        </h4>
      </div>
      <div className="flex-1 overflow-y-auto">
        <pre className="bg-gray-900 rounded-lg p-4 text-gray-100 font-mono text-xs whitespace-pre-wrap overflow-x-auto">
          {latexContent || 'No LaTeX content available. LaTeX will be generated when you save the resume.'}
        </pre>
      </div>
    </div>
  );
}
