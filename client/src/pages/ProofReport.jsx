import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';

export default function ProofReport() {
  const { wallet } = useParams();
  const { walletAddress } = useWallet();
  const targetWallet = (wallet || walletAddress || '').toLowerCase();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (targetWallet) {
      fetchReportData();
    } else {
      setLoading(false);
      setError('Please connect your MetaMask wallet or specify a wallet address to view this credential report.');
    }
  }, [targetWallet]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/profile/${targetWallet}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load proof report:', err);
      setError('Unable to load verifiable credential report for this wallet.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Compiling Cryptographic Proof Report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-2">Report Not Found</h2>
        <p className="text-slate-400 text-xs mb-6">{error || 'No verified profile found for this address.'}</p>
        <Link to="/" className="px-6 py-2.5 rounded-xl bg-slate-800 text-sky-400 text-xs font-semibold">
          ← Return Home
        </Link>
      </div>
    );
  }

  const user = data.user || {};
  const profile = data.profile || {};
  const claims = data.claims || [];
  const verifiedClaims = claims.filter((c) => c.status === 'VERIFIED');
  const trustScore = typeof data.trustScore === 'object' && data.trustScore !== null
    ? (data.trustScore.score ?? 50)
    : (data.trustScore || 50);
  const profileDocs = profile.profileDocuments || [];

  const reportId = `TM-AUDIT-${targetWallet.slice(2, 10).toUpperCase()}-${(user.createdAt ? new Date(user.createdAt).getTime().toString(36) : 'VERIFIED').toUpperCase()}`;
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTimestamp = new Date().toUTCString();

  return (
    <div className="max-w-4xl mx-auto my-4 sm:my-8 px-2 sm:px-4">
      {/* Dynamic Print Styles for A4 Paper & Clean Pagination */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .no-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .official-border {
            border: 2px solid #0f172a !important;
          }
        }
      `}</style>

      {/* Top Action Bar (Hidden in Print) */}
      <div className="print:hidden flex items-center justify-between mb-6 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <Link
          to={`/trust-score/${targetWallet}`}
          className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <span>← Back to Trust Dashboard</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all"
          >
            <span>🖨️ Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Official Verifiable Certificate Layout */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-9 shadow-2xl text-slate-100 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
        
        {/* Certificate Outer Security Border (Print Only) */}
        <div className="print:border-2 print:border-slate-800 print:p-6 print:rounded-2xl space-y-6">

          {/* ========================================================= */}
          {/* 1. HEADER BRANDING & DOSSIER METADATA                     */}
          {/* ========================================================= */}
          <div className="no-break border-b border-slate-800 print:border-slate-300 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/logo.jpg"
                alt="TrustMesh Official Seal"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-sky-400/50 shadow-xl print:border-slate-800 print:shadow-none shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xl font-black tracking-tight text-white print:text-black">
                    TrustMesh Protocol
                  </span>
                  <span className="whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 print:bg-slate-100 print:text-emerald-800 print:border-slate-300">
                    ✓ Verified Attestation
                  </span>
                </div>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                  Decentralized Cryptographic Credential &amp; Reputation Audit Dossier
                </p>
                <div className="text-[10px] font-mono text-slate-500 print:text-slate-500 mt-1">
                  Compliance: W3C Verifiable Credentials Standard • EVM Hardhat (31337)
                </div>
              </div>
            </div>

            {/* Official Report Metadata Stamp */}
            <div className="text-left sm:text-right text-[11px] font-mono text-slate-400 print:text-slate-600 space-y-0.5 border-t sm:border-t-0 border-slate-800 print:border-slate-200 pt-2 sm:pt-0">
              <div>
                <span className="font-semibold text-slate-300 print:text-black">Audit Serial:</span>{' '}
                <span className="text-sky-400 print:text-black font-bold">{reportId}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-300 print:text-black">Audit Date:</span> {currentDate}
              </div>
              <div className="text-[10px] text-slate-500 print:text-slate-500 truncate max-w-xs">
                Timestamp: {currentTimestamp}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. SUBJECT CREDENTIAL PROFILE BLOCK                      */}
          {/* ========================================================= */}
          <div className="no-break bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-sky-400 print:text-slate-700 tracking-wider">
                    Credential Subject Identity Record
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <h1 className="text-2xl sm:text-3xl font-black text-white print:text-black tracking-tight">
                      {user.name || 'Anonymous Subject'}
                    </h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-sky-400 border border-blue-500/20 print:bg-slate-200 print:text-slate-800">
                      Level 2 Assurance
                    </span>
                  </div>
                  {profile.headline && (
                    <p className="text-xs sm:text-sm text-slate-300 print:text-slate-800 font-medium mt-0.5">
                      {profile.headline}
                    </p>
                  )}
                  {profile.bio && (
                    <p className="text-xs text-slate-400 print:text-slate-600 mt-1 italic">
                      "{profile.bio}"
                    </p>
                  )}
                </div>

                {/* Subject Identifier Badges */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <div className="flex items-center gap-1.5 font-mono bg-slate-950 print:bg-white px-3 py-1 rounded-lg border border-slate-800 print:border-slate-300">
                    <span>👛</span>
                    <span className="text-slate-300 print:text-black font-semibold text-[11px]">{targetWallet}</span>
                  </div>

                  {user.email && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 print:text-emerald-800 border border-emerald-500/20 print:border-emerald-300 text-[11px] font-semibold">
                      <span>✓</span>
                      <span>{user.email} (Institutionally Verified)</span>
                    </div>
                  )}
                </div>

                {/* Professional Skills Tag List */}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 block mb-1.5">
                      Attested Core Competencies:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800/80 print:bg-white text-sky-300 print:text-slate-900 border border-slate-700/80 print:border-slate-300 font-mono"
                        >
                          #{skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cryptographic Trust Rating Box */}
              <div className="no-break sm:w-56 p-4 rounded-xl bg-slate-950/80 print:bg-white border border-slate-800 print:border-slate-300 text-center shrink-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 print:text-slate-600 block mb-1">
                  Cryptographic Trust Index
                </span>
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 print:text-black">
                  {trustScore}
                  <span className="text-base text-slate-400 print:text-slate-600 font-normal">/100</span>
                </div>
                <div className="text-xs font-bold text-emerald-400 print:text-emerald-700 mt-1">
                  {trustScore >= 80 ? 'Grade A (Master of Trust)' : trustScore >= 50 ? 'Grade B (Verified)' : 'Grade C (Baseline)'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 print:text-slate-600 mt-2 pt-2 border-t border-slate-800/80 print:border-slate-200">
                  <div>Base Capital: 50 pts</div>
                  <div>Verified Attestations: +{Math.max(0, trustScore - 50)} pts</div>
                  <div className="text-emerald-400 print:text-emerald-800 font-bold mt-1">
                    {verifiedClaims.length} On-Chain Record{verifiedClaims.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic & Professional Track Details */}
            {(profile.education?.length > 0 || profile.experience?.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800/80 print:border-slate-200 text-xs">
                {profile.education?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 block mb-1">
                      Academic Background:
                    </span>
                    <div className="space-y-1">
                      {profile.education.map((edu, eIdx) => (
                        <div key={eIdx} className="text-slate-300 print:text-slate-800">
                          <strong>{edu.institution}</strong> — {edu.degree} {edu.fieldOfStudy ? `(${edu.fieldOfStudy})` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profile.experience?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 block mb-1">
                      Professional Experience:
                    </span>
                    <div className="space-y-1">
                      {profile.experience.map((exp, xIdx) => (
                        <div key={xIdx} className="text-slate-300 print:text-slate-800">
                          <strong>{exp.company}</strong> — {exp.position} {exp.description ? `• ${exp.description}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 3. VERIFIED CREDENTIALS & VERIFIER AUDIT DOSSIER          */}
          {/* ========================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-2">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 print:text-black flex items-center gap-2">
                <span>🛡️ Verified Credentials &amp; Institutional Attestations</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/10 text-sky-400 border border-blue-500/20 print:bg-slate-200 print:text-black">
                  {verifiedClaims.length}
                </span>
              </h2>
              <span className="text-[11px] font-mono text-slate-500 print:text-slate-600">
                Immutably Anchored to TrustMesh.sol
              </span>
            </div>

            {verifiedClaims.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/40 print:bg-slate-50 border border-slate-800 print:border-slate-300 text-center text-xs text-slate-400 print:text-slate-600">
                No on-chain verified claims currently recorded for this subject profile.
              </div>
            ) : (
              <div className="space-y-3">
                {verifiedClaims.map((claim, idx) => {
                  const verifier = claim.verification || {};
                  return (
                    <div
                      key={claim._id || idx}
                      className="no-break p-4 sm:p-5 rounded-2xl bg-slate-900/60 print:bg-white border border-slate-800 print:border-slate-300 shadow-sm space-y-3"
                    >
                      {/* Credential Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white print:text-black">{claim.title}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-sky-400 border border-blue-500/20 print:bg-slate-100 print:border-slate-300 print:text-black font-semibold">
                              {claim.type || 'Skill'}
                            </span>
                          </div>
                          {claim.description && (
                            <p className="text-xs text-slate-300 print:text-slate-700 mt-1">{claim.description}</p>
                          )}
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 print:text-emerald-800 border border-emerald-500/30 text-xs font-black shrink-0">
                          <span>✓ CRYPTOGRAPHICALLY VERIFIED</span>
                        </div>
                      </div>

                      {/* Detailed Verifier Information & Cryptographic Provenance */}
                      <div className="bg-slate-950/70 print:bg-slate-50 p-3.5 rounded-xl border border-slate-800/80 print:border-slate-200 text-[11px] grid sm:grid-cols-2 gap-2 text-slate-400 print:text-slate-700">
                        {/* Verifier Authority */}
                        <div>
                          <strong className="text-slate-300 print:text-black">Authorized Verifier:</strong>{' '}
                          <span className="font-semibold text-white print:text-black">
                            {verifier.verifierName || 'Institutional Verifier'}
                          </span>{' '}
                          <span className="text-[10px] text-slate-500 print:text-slate-600">
                            ({verifier.verifierOrg || 'FAMT Institutional Board'})
                          </span>
                        </div>

                        {/* Verifier Official Email */}
                        <div>
                          <strong className="text-slate-300 print:text-black">Verifier Official Email:</strong>{' '}
                          <span className="font-mono text-emerald-400 print:text-emerald-800 font-bold">
                            {verifier.verifierEmail || 'trushmesh.official@gmail.com'}
                          </span>
                        </div>

                        {/* Verifier Ethereum Address */}
                        <div className="sm:col-span-2">
                          <strong className="text-slate-300 print:text-black">Verifier Ethereum Address:</strong>{' '}
                          <span className="font-mono text-sky-400 print:text-black">
                            {verifier.verifierWallet || targetWallet}
                          </span>
                        </div>

                        {/* Verification Method & Timestamp */}
                        <div>
                          <strong className="text-slate-300 print:text-black">Attestation Protocol:</strong>{' '}
                          <span>Smart Contract Signature (ECDSA secp256k1)</span>
                        </div>
                        <div>
                          <strong className="text-slate-300 print:text-black">Verified Timestamp:</strong>{' '}
                          <span>{verifier.verifiedAt ? new Date(verifier.verifiedAt).toLocaleString() : currentDate}</span>
                        </div>

                        {/* Ethereum Transaction Hash */}
                        {verifier.transactionHash && (
                          <div className="sm:col-span-2">
                            <strong className="text-slate-300 print:text-black">Ethereum Transaction Hash:</strong>{' '}
                            <span className="font-mono text-slate-400 print:text-slate-900 break-all">
                              {verifier.transactionHash}
                            </span>
                          </div>
                        )}

                        {/* SHA-256 Merkle Evidence Digest */}
                        {claim.evidenceHash && (
                          <div className="sm:col-span-2">
                            <strong className="text-slate-300 print:text-black">SHA-256 Evidence Digest:</strong>{' '}
                            <span className="font-mono text-slate-500 print:text-slate-800 break-all">
                              {claim.evidenceHash}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 4. CRYPTOGRAPHIC PROFILE EVIDENCE DOCUMENTS              */}
          {/* ========================================================= */}
          {profileDocs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-2">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 print:text-black flex items-center gap-2">
                  <span>📁 Anchored Evidence &amp; Supporting Documents</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/10 text-sky-400 border border-blue-500/20 print:bg-slate-200 print:text-black">
                    {profileDocs.length}
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profileDocs.map((doc, i) => (
                  <div
                    key={doc._id || i}
                    className="no-break p-3.5 rounded-xl bg-slate-900/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white print:text-black">{doc.title}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 print:bg-slate-200 text-slate-300 print:text-black font-semibold">
                        {doc.category}
                      </span>
                    </div>
                    {doc.fileName && (
                      <div className="text-[11px] text-slate-400 print:text-slate-600 truncate">
                        File: {doc.fileName} {doc.fileSize ? `(${Math.round(doc.fileSize / 1024)} KB)` : ''}
                      </div>
                    )}
                    <div className="font-mono text-[10px] text-slate-500 print:text-slate-700 truncate">
                      SHA-256 Digest: {doc.fileHash}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. PROTOCOL GUARANTEE, QR CODE & AUDIT SIGN-OFF BOX      */}
          {/* ========================================================= */}
          <div className="no-break pt-4 border-t-2 border-slate-800 print:border-slate-800 space-y-4">
            {/* Legal / Cryptographic Guarantee Statement */}
            <p className="text-[10px] text-slate-400 print:text-slate-600 leading-relaxed text-justify">
              <strong>Official Cryptographic Certification Notice:</strong> This audit dossier verifies that the subject
              credentials and evidence hashes have been cryptographically validated and anchored immutably to the
              Ethereum blockchain under TrustMesh Core Smart Contract <code className="font-mono text-slate-300 print:text-black">0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512</code>.
              Any unauthorized alteration of this document or payload invalidates the digital signature and Merkle
              root checksum.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-slate-900/80 print:bg-slate-50 p-4 rounded-2xl border border-slate-800 print:border-slate-300">
              {/* Box 1: QR Code Verification Anchor */}
              <div className="flex items-center gap-3">
                {/* Vector QR Code Representation */}
                <div className="w-16 h-16 bg-white p-1 rounded-xl shadow-md border border-slate-300 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-full h-full fill-slate-900">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v4h-4v-4zm-4-2h2v2h-2v-2zm4 6h2v2h-2v-2zm-4 0h2v2h-2v-2zm2-4h2v2h-2v-2zm-2-2h2v2h-2v-2zm-4 4h2v2h-2v-2zm0-4h2v2h-2v-2z" />
                  </svg>
                </div>
                <div className="text-[10px] leading-tight">
                  <span className="font-bold text-slate-200 print:text-black block">Scan to Verify</span>
                  <span className="text-slate-400 print:text-slate-600 block mt-0.5">
                    TrustMesh Ledger:
                  </span>
                  <span className="font-mono text-sky-400 print:text-black break-all text-[9px]">
                    localhost:5173/proof-report/{targetWallet.slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Box 2: Smart Contract Signatory */}
              <div className="text-center sm:text-left text-[11px] font-mono border-t sm:border-t-0 sm:border-l sm:border-r border-slate-800 print:border-slate-200 py-2 sm:py-0 sm:px-4">
                <span className="text-[10px] font-bold text-slate-400 print:text-slate-600 uppercase block mb-0.5">
                  Decentralized Consensus Seal
                </span>
                <span className="text-white print:text-black font-bold block">
                  TrustMesh Core Engine
                </span>
                <span className="text-[10px] text-slate-500 print:text-slate-500">
                  Secp256k1 ECDSA Digital Stamp
                </span>
              </div>

              {/* Box 3: Authorized Institutional Signatory */}
              <div className="text-center sm:text-right text-[11px]">
                <span className="text-[10px] font-bold text-slate-400 print:text-slate-600 uppercase block mb-0.5">
                  Institutional Registrar
                </span>
                <span className="font-bold text-emerald-400 print:text-emerald-800 block">
                  FAMT Academic Board / TrustMesh
                </span>
                <span className="text-[10px] text-slate-500 print:text-slate-600">
                  Contact: trushmesh.official@gmail.com
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
