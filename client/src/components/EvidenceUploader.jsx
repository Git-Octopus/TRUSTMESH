import React, { useState, useRef } from 'react';
import api from '../services/api';

export default function EvidenceUploader({ claimId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [hash, setHash] = useState('');
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        setFile(null);
        return;
      }
      setFile(selected);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file || !claimId) return;

    try {
      setLoading(true);
      setError('');
      setProgress(10);
      
      const formData = new FormData();
      formData.append('evidence', file);
      
      // Upload evidence
      const res = await api.post(`/claims/${claimId}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => {
          const percent = Math.round((p.loaded * 100) / p.total);
          setProgress(percent);
        }
      });

      setHash(res.data.evidenceHash);
      
      // Simulate slight delay for UX
      setTimeout(() => {
        onSuccess(res.data.evidenceHash);
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
      {hash ? (
        <div className="text-green-400">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <p className="font-semibold">Evidence Uploaded!</p>
          <p className="text-sm font-mono mt-2 break-all text-gray-300">SHA-256: {hash}</p>
        </div>
      ) : (
        <>
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg"
          />
          <button 
            onClick={() => fileInputRef.current.click()}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded mb-4"
            disabled={loading}
          >
            Select File
          </button>
          {file && <p className="text-sm text-gray-300 mb-4">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          
          {loading && (
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div className="bg-tm-blue h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
            </div>
          )}
          
          <button 
            onClick={handleUpload}
            disabled={!file || loading}
            className={`w-full py-2 rounded font-semibold ${!file || loading ? 'bg-gray-700 text-gray-500' : 'bg-tm-blue text-white hover:bg-blue-500'}`}
          >
            {loading ? 'Uploading & Hashing...' : 'Upload Evidence'}
          </button>
        </>
      )}
    </div>
  );
}
