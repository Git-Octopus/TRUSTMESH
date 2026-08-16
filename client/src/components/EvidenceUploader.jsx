import React from 'react';

export default function EvidenceUploader({ onUpload }) {
  return (
    <div className="p-4 border border-dashed rounded-lg border-slate-600 text-center">
      <input type="file" onChange={(e) => onUpload?.(e.target.files[0])} className="hidden" id="evidence-input" />
      <label htmlFor="evidence-input" className="cursor-pointer text-blue-400 hover:underline">
        Upload Evidence File
      </label>
    </div>
  );
}
