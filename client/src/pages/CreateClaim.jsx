import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import EvidenceUploader from '../components/EvidenceUploader';

const CLAIM_TYPES = ['Skill', 'Project', 'Experience', 'Contribution', 'Achievement', 'Recommendation'];

export default function CreateClaim() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: 'Skill',
    title: '',
    description: '',
    organization: '',
    referenceHash: ''
  });
  const [claimId, setClaimId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.type) return setError('Select a claim type');
    }
    if (step === 2) {
      if (!formData.title || !formData.description) return setError('Title and description required');
      
      try {
        setLoading(true);
        setError('');
        // POST to create draft claim
        const res = await api.post('/claims', {
           type: formData.type.toUpperCase(),
           title: formData.title,
           description: formData.description,
           organization: formData.organization
        });
        setClaimId(res.data.claim._id);
      } catch (err) {
        setError('Failed to create claim');
        setLoading(false);
        return;
      }
    }
    setError('');
    setLoading(false);
    setStep(s => s + 1);
  };

  const handleEvidenceSuccess = (evidenceHash) => {
    // Navigate to claim details or dashboard after upload success
    navigate(`/claims`);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Create New Claim</h2>
        <div className="flex space-x-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 flex-1 rounded ${step >= s ? 'bg-tm-blue' : 'bg-gray-700'}`}></div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-400 mt-2">
          <span>Type</span>
          <span>Details</span>
          <span>Evidence</span>
        </div>
      </div>

      <div className="bg-tm-charcoal p-6 rounded-lg shadow-lg border border-gray-800">
        {error && <div className="text-red-400 mb-4">{error}</div>}

        {step === 1 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Select Claim Type</h3>
            <div className="grid grid-cols-2 gap-4">
              {CLAIM_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setFormData({...formData, type})}
                  className={`p-4 rounded border ${formData.type === type ? 'border-tm-blue bg-blue-900/20' : 'border-gray-700 hover:border-gray-500'} transition-colors text-left`}
                >
                  <span className="block font-medium">{type}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handleNext} className="bg-tm-blue px-6 py-2 rounded text-white font-medium">Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Claim Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
              <input type="text" className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-white"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Mastered React & Redux" />
            </div>
            {formData.type === 'Experience' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Organization</label>
                <input type="text" className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-white"
                  value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
              <textarea rows="4" className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-white"
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white px-4 py-2">Back</button>
              <button onClick={handleNext} disabled={loading} className="bg-tm-blue px-6 py-2 rounded text-white font-medium">
                {loading ? 'Creating...' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Upload Evidence</h3>
            <p className="text-gray-400 mb-4 text-sm">Upload a PDF or image (max 5MB) proving your claim. This will be hashed via SHA-256 and sent to the Verifier.</p>
            <EvidenceUploader claimId={claimId} onSuccess={handleEvidenceSuccess} />
          </div>
        )}
      </div>
    </div>
  );
}
