import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Docs() {
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedText, setCopiedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const navSections = [
    { id: 'overview', title: '1. Product Overview', icon: '📖' },
    { id: 'features', title: '2. Key Features', icon: '⚡' },
    { id: 'roles', title: '3. Roles & Permissions', icon: '👥' },
    { id: 'auth', title: '4. Authentication (EIP-4361)', icon: '🔐' },
    { id: 'metamask', title: '5. MetaMask & Network Setup', icon: '🦊' },
    { id: 'contract', title: '6. Smart Contract Architecture', icon: '⛓️' },
    { id: 'api', title: '7. REST API Reference', icon: '🌐' },
    { id: 'docker', title: '8. Docker Quickstart', icon: '🐳' },
    { id: 'security', title: '9. Security & Troubleshooting', icon: '🛡️' },
    { id: 'faq', title: '10. Frequently Asked Questions', icon: '❓' },
  ];

  const filteredSections = navSections.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-sky-400 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Protocol Documentation v1.0 • Web3 Technical Reference
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              TrustMesh Protocol Documentation
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Complete architectural specifications, smart contract integration guides, cryptographic evidence binding workflows, and REST API references.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/claims/new"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
            >
              + Create Claim
            </Link>
            <Link
              to="/"
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sticky top-24 backdrop-blur-md">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              {filteredSections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 ${
                    activeTab === sec.id
                      ? 'bg-blue-600/15 border border-blue-500/40 text-sky-300 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-sm">{sec.icon}</span>
                  <span className="truncate">{sec.title}</span>
                </button>
              ))}
            </div>

            <hr className="border-slate-800 my-4" />

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-[11px] text-slate-400 space-y-2">
              <div className="font-semibold text-slate-300">Contract Address</div>
              <div className="font-mono text-[10px] text-sky-400 break-all select-all">
                0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
              </div>
              <button
                onClick={() =>
                  copyToClipboard('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', 'contract')
                }
                className="w-full py-1 text-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold text-[10px] transition-colors"
              >
                {copiedText === 'contract' ? '✓ Copied' : 'Copy Address'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {/* SECTION 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Section 1</span>
                <h2 className="text-2xl font-bold text-white mt-1">Product Overview & Architecture</h2>
              </div>

              <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                <p>
                  <strong>TrustMesh</strong> is a Web3-native decentralized verification and reputation protocol.
                  It bridges real-world achievements, professional credentials, academic qualifications, and identity attestations
                  with on-chain Ethereum smart contracts and client-side cryptographic SHA-256 evidence hashing.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-2xl mb-2">🛡️</div>
                    <div className="font-bold text-white text-sm mb-1">Zero-Knowledge Evidence</div>
                    <div className="text-xs text-slate-400">Documents hashed client-side with SHA-256 before transit. Smart contract immutably seals fingerprint.</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-2xl mb-2">⚖️</div>
                    <div className="font-bold text-white text-sm mb-1">Dual-Layer Attestation</div>
                    <div className="text-xs text-slate-400">Combines off-chain verification (cryptographic email OTP validation) with on-chain Ethereum transactions.</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-2xl mb-2">📈</div>
                    <div className="font-bold text-white text-sm mb-1">Dynamic Trust Score</div>
                    <div className="text-xs text-slate-400">Algorithmic 0–100 credibility index computed from on-chain confirmations, email proofs, and diversity weights.</div>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white pt-4">Technical Stack & Discipline</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-3">Layer</th>
                        <th className="py-2.5 px-3">Core Technology</th>
                        <th className="py-2.5 px-3">Responsibilities</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-sky-400">Smart Contracts</td>
                        <td className="py-2.5 px-3 font-mono">Solidity ^0.8.20, Hardhat</td>
                        <td className="py-2.5 px-3">On-chain claim creation, verifier registries, attestations, status tracking.</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-emerald-400">Backend API</td>
                        <td className="py-2.5 px-3 font-mono">Node.js, Express, MongoDB</td>
                        <td className="py-2.5 px-3">EIP-4361 signature validation, JWT sessions, Gmail SMTP OTP, Web3 listeners.</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-purple-400">Frontend Client</td>
                        <td className="py-2.5 px-3 font-mono">React 18, Vite, Tailwind, Ethers v6</td>
                        <td className="py-2.5 px-3">MetaMask integration, client-side SHA-256 evidence hashing, responsive UI.</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-amber-400">DevOps</td>
                        <td className="py-2.5 px-3 font-mono">Docker, Docker Compose, Nginx</td>
                        <td className="py-2.5 px-3">Orchestration of client, server, Hardhat blockchain node, and MongoDB.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: KEY FEATURES */}
          {activeTab === 'features' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Section 2</span>
                <h2 className="text-2xl font-bold text-white mt-1">Key Product Features</h2>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">1. EIP-4361 Passwordless Wallet Authentication</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">Free • 0 Gas</span>
                  </div>
                  <p className="text-slate-400">
                    Eliminates passwords and database credential vulnerabilities. Authenticates users using ECDSA cryptographic signatures on random 16-byte server nonces via <code className="text-sky-400 font-mono">personal_sign</code>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">2. Real Gmail SMTP Email OTP Verification</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Security Protocol</span>
                  </div>
                  <p className="text-slate-400">
                    Dual-layer identity confirmation dispatches 6-digit cryptographic verification codes via Google SMTP with 5-minute salted SHA-256 expiration, automatic rate limiting (30s cooldown), and refreshed JWT re-issuance.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">3. Multi-Step Claim Wizard with SHA-256 Hashing</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">Blockchain Anchoring</span>
                  </div>
                  <p className="text-slate-400">
                    Allows users to claim degrees, work experience, certifications, and skills. The file is hashed in the browser before storage, and the resulting cryptographic digest is stamped onto <code className="text-sky-400 font-mono">TrustMesh.sol</code>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">4. Verifier Queue & Attestation Engine</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">Auditor Portal</span>
                  </div>
                  <p className="text-slate-400">
                    Authorizes accredited verifier nodes to inspect submitted evidence, examine pre-flight integrity reports, and execute on-chain verification or rejection transactions with reason strings.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">5. On-Chain Verifier Governance Portal</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">Admin Governance</span>
                  </div>
                  <p className="text-slate-400">
                    Contract owners can whitelist accredited institutions via <code className="text-sky-400 font-mono">registerVerifier(address, name, stake)</code> or revoke malicious verifier addresses on the Ethereum smart contract.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: ROLES & PERMISSIONS */}
          {activeTab === 'roles' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Section 3</span>
                <h2 className="text-2xl font-bold text-white mt-1">User Roles & Permissions Matrix</h2>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Accessible Routes</th>
                      <th className="py-2.5 px-3">Smart Contract Capabilities</th>
                      <th className="py-2.5 px-3">Backend Capabilities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          👤 Claimant (`owner`)
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-sky-400">
                        /claims, /claims/new, /profile, /trust-score/:wallet
                      </td>
                      <td className="py-3 px-3">Can call <code className="text-sky-300">createClaim()</code> and <code className="text-sky-300">registerProfile()</code>.</td>
                      <td className="py-3 px-3">Create/edit draft claims, upload evidence, verify email OTP, edit profile.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                          🔍 Verifier (`verifier`)
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-sky-400">
                        /verifier, /claims, /profile, /trust-score/:wallet
                      </td>
                      <td className="py-3 px-3">Can call <code className="text-teal-300">verifyClaim()</code>, <code className="text-teal-300">rejectClaim()</code>, and <code className="text-teal-300">revokeVerification()</code>.</td>
                      <td className="py-3 px-3">Access verifier review queue, run automated evidence pre-checks, sync attestations.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          🛡️ Admin (`admin`)
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-sky-400">
                        /admin, /verifier, /claims, /profile, /trust-score/:wallet
                      </td>
                      <td className="py-3 px-3">Can call <code className="text-amber-300">registerVerifier()</code>, <code className="text-amber-300">revokeVerifier()</code>, and all verifier functions.</td>
                      <td className="py-3 px-3">Full administrative access over users, verifier authorization, audit log indexing.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-slate-300">
                <span className="font-bold text-sky-400">💡 Quick Role Testing:</span> In the top right header, click the Role Dropdown next to your connected address to instantly test between Claimant, Verifier, and Admin perspectives!
              </div>
            </div>
          )}

          {/* SECTION 4: AUTHENTICATION */}
          {activeTab === 'auth' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Section 4</span>
                <h2 className="text-2xl font-bold text-white mt-1">EIP-4361 Cryptographic Authentication</h2>
              </div>

              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <p>
                  TrustMesh uses an industry-standard Web3 signature-based authentication workflow. No passwords or seeds are ever transmitted.
                </p>

                <div className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px]">
                  <div className="text-slate-400"># Step 1: User requests cryptographic challenge</div>
                  <div className="text-sky-400">POST /api/auth/nonce {'{ walletAddress: "0x..." }'}</div>
                  <div className="text-slate-500">← Response: {'{ nonce: "4b0c14bd436b7532...", message: "Sign this message..." }'}</div>

                  <div className="text-slate-400 pt-2"># Step 2: Client signs message via MetaMask (0 Gas)</div>
                  <div className="text-amber-300">signature = await signer.signMessage(message);</div>

                  <div className="text-slate-400 pt-2"># Step 3: Server validates signature with ethers.verifyMessage</div>
                  <div className="text-sky-400">POST /api/auth/login {'{ walletAddress: "0x...", signature: "0x..." }'}</div>
                  <div className="text-emerald-400">← Response: {'{ token: "<jwt_token>", role: "owner", user: { ... } }'}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h4 className="font-bold text-white text-sm mb-2">Replay Attack Protection</h4>
                  <p className="text-slate-400 text-xs">
                    Each generated nonce is a 16-byte cryptographically random value. Once verified, the nonce is wiped from the database (<code className="text-sky-400">user.nonce = null</code>). Re-submitting an old signature will always be rejected.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: METAMASK & NETWORK SETUP */}
          {activeTab === 'metamask' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Section 5</span>
                <h2 className="text-2xl font-bold text-white mt-1">MetaMask & Network Setup</h2>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <p>
                  To interact with the local TrustMesh network, add the following parameters in MetaMask (<strong>Settings &rarr; Networks &rarr; Add network manually</strong>):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-slate-400 text-[10px]">Network Name</div>
                      <div className="font-bold text-white text-sm">Hardhat Localhost</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-slate-400 text-[10px]">RPC URL</div>
                      <div className="font-mono text-sky-400 text-xs">http://127.0.0.1:8545</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard('http://127.0.0.1:8545', 'rpc')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-200"
                    >
                      {copiedText === 'rpc' ? '✓' : 'Copy'}
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-slate-400 text-[10px]">Chain ID</div>
                      <div className="font-mono text-white text-sm font-bold">31337</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-slate-400 text-[10px]">Currency Symbol</div>
                      <div className="font-mono text-white text-sm font-bold">ETH</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-slate-300 space-y-2">
                  <div className="font-bold text-amber-400 text-sm">⚠️ MetaMask Yellow Warning: "Suggested name: GoChain Testnet"</div>
                  <p className="text-xs text-slate-400">
                    Chain ID 31337 was historically registered to GoChain testnet in MetaMask's public directory. <strong>This is only an advisory warning and not an error.</strong> You can safely ignore the yellow text and click <strong>Save</strong>.
                  </p>
                </div>

                <h3 className="font-bold text-white text-sm pt-2">Import Pre-Funded Test Account (10,000 ETH)</h3>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="text-slate-400">Account #0 Private Key:</div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800 text-sky-400 break-all select-all">
                    0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
                        'pk'
                      )
                    }
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                  >
                    {copiedText === 'pk' ? '✓ Copied Private Key' : 'Copy Private Key'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: SMART CONTRACT ARCHITECTURE */}
          {activeTab === 'contract' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Section 6</span>
                <h2 className="text-2xl font-bold text-white mt-1">Smart Contract Architecture (`TrustMesh.sol`)</h2>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <p>
                  The core smart contract <code className="text-sky-400">TrustMesh.sol</code> manages immutable on-chain credential state, access control, and verifier permissions.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3">Function</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Access Control</th>
                        <th className="py-2 px-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      <tr>
                        <td className="py-2 px-3 text-sky-400">createClaim(type, refHash)</td>
                        <td className="py-2 px-3 text-amber-400">Write</td>
                        <td className="py-2 px-3 text-slate-400">Any Wallet</td>
                        <td className="py-2 px-3 font-sans text-xs">Mints pending on-chain claim with SHA-256 evidence digest.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-sky-400">verifyClaim(claimId)</td>
                        <td className="py-2 px-3 text-amber-400">Write</td>
                        <td className="py-2 px-3 text-teal-400">onlyAuthorizedVerifier</td>
                        <td className="py-2 px-3 font-sans text-xs">Sets claim status to VERIFIED and records verifier address.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-sky-400">rejectClaim(claimId, reason)</td>
                        <td className="py-2 px-3 text-amber-400">Write</td>
                        <td className="py-2 px-3 text-teal-400">onlyAuthorizedVerifier</td>
                        <td className="py-2 px-3 font-sans text-xs">Sets claim status to REJECTED and emits reason string.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-sky-400">registerVerifier(address, name, stake)</td>
                        <td className="py-2 px-3 text-amber-400">Write</td>
                        <td className="py-2 px-3 text-rose-400">onlyOwner</td>
                        <td className="py-2 px-3 font-sans text-xs">Authorizes new verifier address on the smart contract.</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-sky-400">getClaim(claimId)</td>
                        <td className="py-2 px-3 text-emerald-400">Read (0 Gas)</td>
                        <td className="py-2 px-3 text-slate-400">Public</td>
                        <td className="py-2 px-3 font-sans text-xs">Returns on-chain claim struct (claimant, status, hash, verifier).</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: REST API */}
          {activeTab === 'api' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Section 7</span>
                <h2 className="text-2xl font-bold text-white mt-1">REST API Reference (Port 5000)</h2>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Endpoint</th>
                      <th className="py-2.5 px-3">Auth</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                    <tr>
                      <td className="py-2 px-3 text-emerald-400 font-bold">POST</td>
                      <td className="py-2 px-3 text-sky-400">/api/auth/nonce</td>
                      <td className="py-2 px-3 text-slate-400">No</td>
                      <td className="py-2 px-3 text-slate-400">Public</td>
                      <td className="py-2 px-3 font-sans text-xs">Request cryptographic sign-in challenge.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-400 font-bold">POST</td>
                      <td className="py-2 px-3 text-sky-400">/api/auth/login</td>
                      <td className="py-2 px-3 text-slate-400">No</td>
                      <td className="py-2 px-3 text-slate-400">Public</td>
                      <td className="py-2 px-3 font-sans text-xs">Verify signature and obtain JWT.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-400 font-bold">POST</td>
                      <td className="py-2 px-3 text-sky-400">/api/auth/send-otp</td>
                      <td className="py-2 px-3 text-amber-400">Bearer</td>
                      <td className="py-2 px-3 text-slate-300">All</td>
                      <td className="py-2 px-3 font-sans text-xs">Send 6-digit verification code via Gmail SMTP.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-400 font-bold">POST</td>
                      <td className="py-2 px-3 text-sky-400">/api/auth/verify-otp</td>
                      <td className="py-2 px-3 text-amber-400">Bearer</td>
                      <td className="py-2 px-3 text-slate-300">All</td>
                      <td className="py-2 px-3 font-sans text-xs">Verify code, set emailVerified=true, re-issue JWT.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-blue-400 font-bold">GET</td>
                      <td className="py-2 px-3 text-sky-400">/api/profile/:wallet</td>
                      <td className="py-2 px-3 text-slate-400">No</td>
                      <td className="py-2 px-3 text-slate-400">Public</td>
                      <td className="py-2 px-3 font-sans text-xs">Get public profile, claims, and live trust score.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-purple-400 font-bold">PUT</td>
                      <td className="py-2 px-3 text-sky-400">/api/profile</td>
                      <td className="py-2 px-3 text-amber-400">Bearer</td>
                      <td className="py-2 px-3 text-slate-300">All</td>
                      <td className="py-2 px-3 font-sans text-xs">Update profile (name, bio, skills, education) without OTP.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-400 font-bold">POST</td>
                      <td className="py-2 px-3 text-sky-400">/api/claims</td>
                      <td className="py-2 px-3 text-amber-400">Bearer</td>
                      <td className="py-2 px-3 text-slate-300">Claimant</td>
                      <td className="py-2 px-3 font-sans text-xs">Submit claim metadata to database.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-400 font-bold">POST</td>
                      <td className="py-2 px-3 text-sky-400">/api/verification/sync</td>
                      <td className="py-2 px-3 text-amber-400">Bearer</td>
                      <td className="py-2 px-3 text-teal-400">Verifier</td>
                      <td className="py-2 px-3 font-sans text-xs">Record on-chain verification transaction to audit trail.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-400 font-bold">POST</td>
                      <td className="py-2 px-3 text-sky-400">/api/verifiers</td>
                      <td className="py-2 px-3 text-amber-400">Bearer</td>
                      <td className="py-2 px-3 text-rose-400">Admin</td>
                      <td className="py-2 px-3 font-sans text-xs">Authorize verifier address in system registry.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 8: DOCKER QUICKSTART */}
          {activeTab === 'docker' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Section 8</span>
                <h2 className="text-2xl font-bold text-white mt-1">Docker Multi-Container Quickstart</h2>
              </div>

              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <p>
                  TrustMesh is orchestrated via Docker Compose. The entire network builds and connects automatically with one command:
                </p>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                  <div className="text-slate-400"># Start full production stack:</div>
                  <div className="text-sky-400 font-bold">docker compose up --build -d</div>
                </div>

                <h3 className="font-bold text-white text-sm pt-2">Running Containers</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-sky-400 font-bold">trustmesh-client</div>
                    <div className="text-slate-400 text-[11px]">Port 5173 (Nginx Alpine)</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-emerald-400 font-bold">trustmesh-server</div>
                    <div className="text-slate-400 text-[11px]">Port 5000 (Node.js 20 Express)</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-purple-400 font-bold">trustmesh-blockchain</div>
                    <div className="text-slate-400 text-[11px]">Port 8545 (Hardhat JSON-RPC)</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-amber-400 font-bold">trustmesh-mongo</div>
                    <div className="text-slate-400 text-[11px]">Port 27017 (MongoDB 7.0)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 9: SECURITY */}
          {activeTab === 'security' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Section 9</span>
                <h2 className="text-2xl font-bold text-white mt-1">Security Architecture & Troubleshooting</h2>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm">Common Issue 1: "Network fee alert" in MetaMask</div>
                  <p className="text-slate-400">
                    <strong>Cause:</strong> Your imported account has 0 ETH.
                    <br />
                    <strong>Solution:</strong> Send local test ETH from Hardhat Account #0 (`0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`) or import Account #0 directly using private key <code className="text-sky-400">0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80</code>.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm">Common Issue 2: "Invalid or expired authentication token"</div>
                  <p className="text-slate-400">
                    <strong>Cause:</strong> The server restarted or your session expired in localStorage.
                    <br />
                    <strong>Solution:</strong> Click <strong>Disconnect</strong> in the header and re-connect via MetaMask to obtain a fresh signature and JWT session.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm">Common Issue 3: Gmail BadCredentials (535-5.7.8)</div>
                  <p className="text-slate-400">
                    <strong>Cause:</strong> Entering regular Google account password instead of Google App Password.
                    <br />
                    <strong>Solution:</strong> Generate a 16-character App Password at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-sky-400 underline">Google App Passwords</a> and save it in <code className="text-sky-400">.env</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 10: FAQ */}
          {activeTab === 'faq' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Section 10</span>
                <h2 className="text-2xl font-bold text-white mt-1">Frequently Asked Questions (FAQ)</h2>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white text-sm">What wallets are supported?</div>
                  <p className="text-slate-400">Any EIP-1193 compliant Web3 browser wallet, including MetaMask, Coinbase Wallet, Brave Wallet, and Rabby.</p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white text-sm">Why does MetaMask prompt to sign a message instead of sending a transaction?</div>
                  <p className="text-slate-400">Signing a message verifies ownership of your private key without writing data to the blockchain. It is 100% free and consumes zero gas.</p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white text-sm">Do I need real Ethereum to test?</div>
                  <p className="text-slate-400">No. The local Hardhat node automatically creates 20 pre-funded test accounts with 10,000 ETH each.</p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white text-sm">What happens if an uploaded document is edited later?</div>
                  <p className="text-slate-400">The SHA-256 digest is immutably sealed in the smart contract. Any 1-bit alteration causes a hash mismatch, failing the verification audit immediately.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
