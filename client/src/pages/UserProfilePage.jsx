import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useWallet, isProfileCompleteAndVerified } from '../hooks/useWallet';
import { useOtp } from '../hooks/useOtp';
import StatusBadge from '../components/StatusBadge';
import OtpInput from '../components/OtpInput';

export default function UserProfilePage() {
  const { walletAddress, profile, setProfile, user, refreshSession } = useWallet();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving' | 'saved' | 'error' | ''
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);

  // Profile Documents State
  const [profileDocuments, setProfileDocuments] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('identity');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docMessage, setDocMessage] = useState('');

  // OTP Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const { loading: otpLoading, error: otpError, setError: setOtpError, sendOtp, verifyOtp, resetOtp } = useOtp();

  useEffect(() => {
    if (walletAddress) {
      loadProfile();
    }
  }, [walletAddress]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/profile/${walletAddress}`);
      if (res.data) {
        const u = res.data.user || {};
        const p = res.data.profile || {};
        setName(p.name || u.name || '');
        setEmail(u.email || '');
        setIsEmailVerified(Boolean(u.emailVerified));
        if (u.emailVerified && u.email) {
          setVerifiedEmail(u.email.toLowerCase().trim());
        }
        setHeadline(p.headline || '');
        setBio(p.bio || '');
        setProfileImage(p.profileImage || '');
        setSkills(p.skills || []);
        setEducation(p.education || []);
        setExperience(p.experience || []);
        setProfileDocuments(p.profileDocuments || []);
        setProfile(p);
      }
    } catch (err) {
      // Profile 404 is normal for newly connected wallets
      if (err.response?.status !== 404) {
        console.error('Failed to load profile:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSaveStatus('saving');
      setErrorMessage('');

      const payload = {
        name,
        email,
        headline,
        bio,
        profileImage,
        skills,
        education,
        experience
      };

      const reqMethod = profile ? api.put : api.post;
      const res = await reqMethod('/profile', payload);

      setProfile(res.data.profile);
      if (res.data.user) {
        useWallet.getState().setUser(res.data.user);
        setIsEmailVerified(Boolean(res.data.user.emailVerified));
        if (res.data.user.emailVerified && res.data.user.email) {
          setVerifiedEmail(res.data.user.email.toLowerCase().trim());
        }
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setErrorMessage(err.response?.data?.message || 'Failed to save profile changes');
    }
  };

  // Skill Tag Handlers
  const handleAddSkill = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
      e.preventDefault();
      const clean = skillInput.trim().replace(/^,|,$/g, '');
      if (clean && !skills.includes(clean)) {
        setSkills([...skills, clean]);
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Education Repeatable Rows Handlers
  const handleAddEducation = () => {
    setEducation([
      ...education,
      { institution: '', degree: '', fieldOfStudy: '', description: '' }
    ]);
  };

  const handleUpdateEducation = (index, field, val) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: val };
    setEducation(updated);
  };

  const handleRemoveEducation = (index) => {
    setEducation(education.filter((_, idx) => idx !== index));
  };

  // Experience Repeatable Rows Handlers
  const handleAddExperience = () => {
    setExperience([
      ...experience,
      { company: '', position: '', description: '' }
    ]);
  };

  const handleUpdateExperience = (index, field, val) => {
    const updated = [...experience];
    updated[index] = { ...updated[index], [field]: val };
    setExperience(updated);
  };

  const handleRemoveExperience = (index) => {
    setExperience(experience.filter((_, idx) => idx !== index));
  };

  // OTP Verification Handlers
  const handleOpenOtpModal = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address first.');
      return;
    }
    resetOtp();
    setIsOtpModalOpen(true);
    await sendOtp(email);
  };

  const handleOtpComplete = async (code) => {
    const res = await verifyOtp(email, code);
    if (res && res.success) {
      setIsEmailVerified(true);
      setVerifiedEmail(email.toLowerCase().trim());
      if (res.token) {
        useWallet.getState().setToken(res.token);
      }
      if (res.user) {
        useWallet.getState().setUser(res.user);
      }
      await refreshSession();
      setTimeout(() => {
        setIsOtpModalOpen(false);
      }, 1200);
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (verifiedEmail && val.trim().toLowerCase() === verifiedEmail.trim().toLowerCase()) {
      setIsEmailVerified(true);
    } else {
      setIsEmailVerified(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a file to upload.');
      return;
    }
    try {
      setDocUploading(true);
      setDocMessage('');
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('title', uploadTitle || uploadFile.name);

      const res = await api.post('/profile/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfileDocuments(res.data.profileDocuments || []);
      setUploadFile(null);
      setUploadTitle('');
      setDocMessage('Document uploaded and cryptographically indexed ✓');
      setTimeout(() => setDocMessage(''), 4000);
    } catch (err) {
      console.error('Failed to upload document:', err);
      const detailedError =
        (err.response?.data?.errors && err.response.data.errors.join('\n')) ||
        err.response?.data?.message ||
        'Failed to upload document.';
      alert(detailedError);
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this profile document?')) return;
    try {
      const res = await api.delete(`/profile/documents/${docId}`);
      setProfileDocuments(res.data.profileDocuments || []);
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete document.');
    }
  };

  const isStep1Done = isProfileCompleteAndVerified(user, 'user') || (Boolean(name?.trim()) && Boolean(isEmailVerified));

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-tm-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Trust Profile</h1>
          <p className="text-sm text-slate-400 mt-1">
            Build your decentralized professional identity and verify claims cryptographically.
          </p>
        </div>

        {/* Live Save Status Indicator */}
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Saving changes...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Saved ✓
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> {errorMessage || 'Save error'}
            </span>
          )}

          {isStep1Done ? (
            <Link
              to={`/proof-report/${walletAddress}`}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-sky-400 hover:text-sky-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>📄</span>
              <span className="hidden sm:inline">Proof Report</span>
            </Link>
          ) : (
            <div
              title="Complete your profile and email verification to unlock the Proof Report"
              className="px-4 py-2.5 rounded-xl bg-slate-800/50 text-slate-500 border border-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed"
            >
              <span>🔒</span>
              <span className="hidden sm:inline">Proof Report (Step 1 Required)</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-6 py-2.5 rounded-xl bg-tm-blue hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Step 1 Mandatory Gate Notice Banner */}
      {!isStep1Done && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3.5 shadow-lg animate-pulse">
          <span className="text-2xl shrink-0 mt-0.5">🔒</span>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <span>Step 1 Required: Profile Information &amp; Email Verification</span>
              <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                Action Required
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Before submitting claims, calculating your decentralized Trust Score, or generating cryptographic Proof Reports, you must save your <strong>Full Name</strong> and verify your <strong>Email Address</strong> via OTP below.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Basic Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <span>👤</span> Personal Information
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Satoshi Nakamoto"
                className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                Professional Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Full-Stack Web3 Developer & Security Auditor"
                className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Email with Verification Badge & OTP Trigger */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Email Address (Required for Verification Engine)
              </label>
              {isEmailVerified ? (
                <StatusBadge status="EMAIL-VERIFIED" size="sm" />
              ) : (
                <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  UNVERIFIED
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="developer@domain.com"
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none transition-colors"
                required
              />

              {!isEmailVerified && (
                <button
                  type="button"
                  onClick={handleOpenOtpModal}
                  className="px-5 py-3 rounded-xl bg-tm-teal/15 hover:bg-tm-teal/25 border border-tm-teal/40 text-tm-teal font-medium text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
                >
                  ✉️ Verify via OTP
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              The verification engine requires email validation before claims can transition from pending to verified.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
              Bio / Summary
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief professional background, passions, and achievements..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
              Profile Avatar Image URL
            </label>
            <input
              type="url"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Section 2: Skills Tag Input */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <span>⚡</span> Skills & Competencies
          </h2>

          <div>
            <label className="block text-xs text-slate-400 mb-2">
              Add skills (type and press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono">Enter</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono">,</kbd>)
            </label>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
              placeholder="e.g. Solidity, React, Node.js, Zero-Knowledge..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-tm-blue rounded-xl p-3 text-white text-sm focus:outline-none transition-colors mb-3"
            />

            <div className="flex flex-wrap gap-2 min-h-[38px] p-2 bg-slate-950/50 rounded-xl border border-slate-800/80">
              {skills.length === 0 ? (
                <span className="text-xs text-slate-500 italic p-1">No skills added yet.</span>
              ) : (
                skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700/80 group"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-slate-400 hover:text-rose-400 transition-colors ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Experience (Repeatable Rows) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>💼</span> Work Experience
            </h2>
            <button
              type="button"
              onClick={handleAddExperience}
              className="text-xs font-semibold text-tm-teal hover:underline flex items-center gap-1"
            >
              + Add Experience Row
            </button>
          </div>

          {experience.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No experience rows added yet.</p>
          ) : (
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx} className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-4 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-400">Position #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(idx)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Company / Organization Name"
                        value={exp.company}
                        onChange={(e) => handleUpdateExperience(idx, 'company', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-tm-blue"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Job Title / Role"
                        value={exp.position}
                        onChange={(e) => handleUpdateExperience(idx, 'position', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-tm-blue"
                      />
                    </div>
                  </div>
                  <div>
                    <textarea
                      rows={2}
                      placeholder="Brief summary of duties, achievements, or impact..."
                      value={exp.description}
                      onChange={(e) => handleUpdateExperience(idx, 'description', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-tm-blue"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Education (Repeatable Rows) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎓</span> Education & Certifications
            </h2>
            <button
              type="button"
              onClick={handleAddEducation}
              className="text-xs font-semibold text-tm-teal hover:underline flex items-center gap-1"
            >
              + Add Education Row
            </button>
          </div>

          {education.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No education rows added yet.</p>
          ) : (
            <div className="space-y-4">
              {education.map((edu, idx) => (
                <div key={idx} className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-4 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-400">Education #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(idx)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Institution / University Name"
                        value={edu.institution}
                        onChange={(e) => handleUpdateEducation(idx, 'institution', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-tm-blue"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Degree / Diploma"
                        value={edu.degree}
                        onChange={(e) => handleUpdateEducation(idx, 'degree', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-tm-blue"
                      />
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Field of Study / Major"
                      value={edu.fieldOfStudy}
                      onChange={(e) => handleUpdateEducation(idx, 'fieldOfStudy', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-tm-blue"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Profile Verification Documents */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📁</span> Cryptographic Profile Documents
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload official evidence documents across different aspects (Identity, Degree, Resume, Experience).
              </p>
            </div>
            {docMessage && (
              <span className="text-xs font-semibold text-emerald-400 animate-fadeIn">
                {docMessage}
              </span>
            )}
          </div>

          {/* Upload Widget */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Attach New Evidence Document
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Document Aspect / Category *
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="identity">🪪 Government ID / Passport</option>
                  <option value="degree">📜 Academic Degree / Diploma</option>
                  <option value="resume">📄 Resume / Curriculum Vitae</option>
                  <option value="employment">💼 Employment / Experience Letter</option>
                  <option value="organization">🏛️ Organization Accreditation</option>
                  <option value="other">📑 Other Evidence Document</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Document Title / Label
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g., Passport Copy / B.S. Degree"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Choose File (PDF, PNG, JPG, DOCX) *
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-slate-300 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleUploadDocument}
                disabled={docUploading || !uploadFile}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-white font-bold text-xs shadow-md shadow-teal-500/20 disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                <span>{docUploading ? 'Hashing & Uploading...' : 'Upload & Compute SHA-256 →'}</span>
              </button>
            </div>
          </div>

          {/* List of Uploaded Documents */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Attached Documents ({profileDocuments.length})
            </h3>
            {profileDocuments.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No profile evidence documents attached yet. Attach your identity or degree documents above.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profileDocuments.map((doc) => (
                  <div
                    key={doc._id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-2 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-xs truncate">{doc.title}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-sky-400 border border-blue-500/20 shrink-0">
                          {doc.category}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 truncate mt-1">
                        SHA-256: {doc.fileHash}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        File: {doc.fileName} • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                      <a
                        href={doc.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:text-sky-300 font-semibold text-[11px] flex items-center gap-1"
                      >
                        <span>👁️ View File</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc._id)}
                        className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>

      {/* OTP Verification Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 sm:p-8 text-white shadow-2xl relative">
            <button
              onClick={() => setIsOtpModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-mono"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-tm-blue/15 border border-tm-blue/30 flex items-center justify-center text-xl">
                ✉️
              </div>
              <h3 className="text-xl font-bold">Email Verification</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter the 6-digit cryptographic verification code sent to:
              </p>
              <p className="font-mono text-xs text-tm-teal mt-1 font-semibold break-all">
                {email}
              </p>
            </div>

            <OtpInput
              onComplete={handleOtpComplete}
              onResend={() => sendOtp(email)}
              isVerifying={otpLoading}
              error={otpError}
            />

            {isEmailVerified && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs font-semibold text-emerald-400">
                ✓ Email verified successfully!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
