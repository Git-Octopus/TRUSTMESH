import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import EvidenceUploader from '../components/EvidenceUploader';
import StatusBadge from '../components/StatusBadge';
import TxStatusModal from '../components/TxStatusModal';
import { createOnChainClaim } from '../services/web3';

const CLAIM_TYPES = [
  { type: 'Skill', icon: '💡', desc: 'Technical or specialized capability (e.g. Solidity, Python, Data Science)' },
  { type: 'Project', icon: '🚀', desc: 'Shipped product, open-source repository, or prototype codebase' },
  { type: 'Experience', icon: '💼', desc: 'Employment, apprenticeship, or professional contract role' },
  { type: 'Contribution', icon: '🛠️', desc: 'Code commits, pull requests, bug bounty, or DAO participation' },
  { type: 'Achievement', icon: '🏆', desc: 'Certification, hackathon win, publication, or academic award' },
  { type: 'Recommendation', icon: '🤝', desc: 'Peer, mentor, or client cryptographic endorsement' },
];

export default function CreateClaim() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: 'Skill',
    title: '',
    description: '',
    // Dynamic fields
    organization: '',
    organizationDomain: '',
    projectUrl: '',
    repoUrl: '',
    proficiencyLevel: 'Expert',
    issuingAuthority: '',
    recommenderName: '',
  });

  const [createdClaim, setCreatedClaim] = useState(null);
  const [evidenceHash, setEvidenceHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lifecycleStatus, setLifecycleStatus] = useState('DRAFT');

  // TxModal State
  const [txModal, setTxModal] = useState({
    isOpen: false,
    status: 'signing',
    message: '',
    txHash: '',
    error: '',
  });

  const navigate = useNavigate();

  const handleStep1Next = () => {
    if (!formData.type) {
      setError('Please select a claim category');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleStep2Next = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create DRAFT -> SUBMITTED claim in MongoDB
      const res = await api.post('/claims', {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        organization: formData.organization,
        status: 'SUBMITTED',
      });

      setCreatedClaim(res.data.claim);
      setLifecycleStatus('SUBMITTED');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create claim record.');
    } finally {
      setLoading(false);
    }
  };

  const handleEvidenceSuccess = async (hash) => {
    setEvidenceHash(hash);
    setLifecycleStatus('EVIDENCE_CHECK');

    try {
      // Run automated evidence check pipeline
      if (createdClaim?._id) {
        const checkRes = await api.post('/verification/evidence-check', {
          claimId: createdClaim._id,
        });

        if (checkRes.data?.status) {
          setLifecycleStatus(checkRes.data.status);
        }
      }
    } catch (err) {
      console.warn('Automated evidence check non-fatal error:', err);
    }

    // Move to step 4 (Lifecycle Status & On-Chain Trigger)
    setStep(4);
  };

  const handleRegisterOnChain = async () => {
    if (!evidenceHash) {
      alert('Evidence hash is required before recording on-chain.');
      return;
    }

    try {
      setTxModal({
        isOpen: true,
        status: 'signing',
        message: 'Please confirm the createClaim transaction in your MetaMask wallet.',
        txHash: '',
        error: '',
      });

      const { tx, claimId } = await createOnChainClaim(formData.type, evidenceHash);

      setTxModal({
        isOpen: true,
        status: 'mining',
        message: 'Transaction broadcast. Waiting for block confirmation...',
        txHash: tx.hash,
        error: '',
      });

      // Update onChainClaimId on the backend claim document
      if (createdClaim?._id) {
        await api.put(`/claims/${createdClaim._id}`, {
          onChainClaimId: claimId,
        });
      }

      setTxModal({
        isOpen: true,
        status: 'success',
        message: `Claim #${claimId} successfully registered on the TrustMesh ledger!`,
        txHash: tx.hash,
        error: '',
      });
    } catch (err) {
      console.error(err);
      setTxModal({
        isOpen: true,
        status: 'error',
        message: '',
        txHash: '',
        error: err.reason || err.message || 'Transaction was rejected.',
      });
    }
  };

  const handleRequestVerification = async () => {
    try {
      setLoading(true);
      await api.post('/verification/request', {
        claimId: createdClaim._id,
      });
      setLifecycleStatus('VERIFICATION_PENDING');
      alert('Verification request submitted! Verifiers can now inspect and approve your claim.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit verification request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Stepper Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">Create New Claim</h1>
        <div className="flex space-x-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all ${
                step >= s ? 'bg-tm-blue' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs font-mono uppercase text-slate-400 mt-2 px-1">
          <span className={step >= 1 ? 'text-tm-teal' : ''}>1. Category</span>
          <span className={step >= 2 ? 'text-tm-teal' : ''}>2. Details</span>
          <span className={step >= 3 ? 'text-tm-teal' : ''}>3. Evidence</span>
          <span className={step >= 4 ? 'text-tm-teal' : ''}>4. Lifecycle</span>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* STEP 1: Claim Type Selection */}
      {step === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-2">Select Claim Category</h2>
          <p className="text-sm text-slate-400 mb-6">
            Choose the type of credential or accomplishment you want to establish.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {CLAIM_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setFormData({ ...formData, type: t.type })}
                className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  formData.type === t.type
                    ? 'border-tm-blue bg-blue-500/10 shadow-lg shadow-blue-500/10 ring-1 ring-tm-blue'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <h3 className="font-bold text-white text-base mb-1">{t.type}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={handleStep1Next}
              className="px-6 py-2.5 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20"
            >
              Continue to Details →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Claim Details & Dynamic Fields */}
      {step === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white">
              {formData.type} Details
            </h2>
            <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md">
              {formData.type}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
              Claim Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={
                formData.type === 'Skill'
                  ? 'e.g. Senior Smart Contract Engineer (Solidity & Foundry)'
                  : formData.type === 'Experience'
                  ? 'e.g. Lead Blockchain Architect at OpenSea'
                  : 'e.g. Contributed Core EIP-4337 Account Abstraction PR'
              }
              className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Dynamic Fields per Category */}
          {formData.type === 'Experience' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  Organization / Company
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="e.g. ConsenSys / Ethereum Foundation"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  Company Domain / Website
                </label>
                <input
                  type="text"
                  value={formData.organizationDomain}
                  onChange={(e) => setFormData({ ...formData, organizationDomain: e.target.value })}
                  placeholder="consensys.io"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none"
                />
              </div>
            </div>
          )}

          {formData.type === 'Project' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  Live Project URL
                </label>
                <input
                  type="url"
                  value={formData.projectUrl}
                  onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                  placeholder="https://app.trustmesh.io"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                  Source Code / Repo URL
                </label>
                <input
                  type="url"
                  value={formData.repoUrl}
                  onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                  placeholder="https://github.com/org/repo"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none"
                />
              </div>
            </div>
          )}

          {formData.type === 'Skill' && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                Proficiency Level
              </label>
              <select
                value={formData.proficiencyLevel}
                onChange={(e) => setFormData({ ...formData, proficiencyLevel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none"
              >
                <option value="Expert">Expert / Production-grade</option>
                <option value="Advanced">Advanced Practitioner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Foundational">Foundational</option>
              </select>
            </div>
          )}

          {formData.type === 'Achievement' && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                Issuing Authority / Institution
              </label>
              <input
                type="text"
                value={formData.issuingAuthority}
                onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                placeholder="e.g. Blockchain Training Alliance / ETHGlobal"
                className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
              Comprehensive Description & Proof Context
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your role, responsibilities, specific contributions, or accomplishments..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleStep2Next}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'Creating Draft...' : 'Next: Attach Evidence →'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Evidence Upload */}
      {step === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white">Upload Cryptographic Evidence</h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload certificate, contract, payslip, or credential proof (PDF/PNG/JPG, max 5MB).
              The server will validate MIME signatures and generate an immutable SHA-256 fingerprint.
            </p>
          </div>

          {createdClaim && (
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-slate-500 uppercase">Draft Claim Created</span>
                <h4 className="font-bold text-white text-sm">{createdClaim.title}</h4>
              </div>
              <StatusBadge status={lifecycleStatus} size="sm" />
            </div>
          )}

          <EvidenceUploader
            claimId={createdClaim?._id}
            onSuccess={handleEvidenceSuccess}
          />
        </div>
      )}

      {/* STEP 4: Lifecycle Tracker & On-Chain Registration */}
      {step === 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white">Claim Lifecycle Status</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your evidence has been hashed and entered into the TrustMesh verification pipeline.
            </p>
          </div>

          {/* Mini Lifecycle Progress Stepper */}
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-4">
              Lifecycle Progress
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {[
                { id: 'DRAFT', label: 'Draft' },
                { id: 'SUBMITTED', label: 'Submitted' },
                { id: 'EVIDENCE_CHECK', label: 'Evidence Checked' },
                { id: 'VERIFICATION_PENDING', label: 'Verifier Queue' },
              ].map((stage, idx) => (
                <div key={stage.id} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs font-bold font-mono">
                    ✓
                  </span>
                  <span className="text-xs font-semibold text-slate-200">{stage.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">Current State:</span>
              <StatusBadge status={lifecycleStatus} size="md" />
            </div>
          </div>

          {evidenceHash && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-xs font-mono text-slate-500 block mb-1">
                SHA-256 Evidence Digest
              </span>
              <p className="font-mono text-xs text-tm-teal break-all select-all">
                {evidenceHash}
              </p>
            </div>
          )}

          {/* On-Chain & Verifier Action Triggers */}
          <div className="grid sm:grid-cols-2 gap-4 pt-4">
            <button
              type="button"
              onClick={handleRegisterOnChain}
              className="p-4 rounded-xl border border-tm-blue/60 bg-tm-blue/10 hover:bg-tm-blue/20 text-white font-medium text-xs transition-colors text-left flex items-center gap-3"
            >
              <span className="text-2xl">🔗</span>
              <div>
                <p className="font-bold">Register on Ethereum</p>
                <p className="text-[11px] text-slate-400">Mint claim on smart contract via MetaMask</p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleRequestVerification}
              disabled={loading}
              className="p-4 rounded-xl border border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-white font-medium text-xs transition-colors text-left flex items-center gap-3"
            >
              <span className="text-2xl">⚡</span>
              <div>
                <p className="font-bold">Request Verification</p>
                <p className="text-[11px] text-slate-400">Alert authorized verifiers to review claim</p>
              </div>
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/claims')}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all"
            >
              View in My Claims →
            </button>
          </div>
        </div>
      )}

      {/* MetaMask Transaction Modal */}
      <TxStatusModal
        isOpen={txModal.isOpen}
        status={txModal.status}
        message={txModal.message}
        txHash={txModal.txHash}
        error={txModal.error}
        onClose={() => setTxModal({ ...txModal, isOpen: false })}
      />
    </div>
  );
}
