import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useWallet } from '../hooks/useWallet';

export default function Profile() {
  const { walletAddress, profile, setProfile } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    headline: '',
    bio: '',
    email: ''
  });

  console.log("[Profile] RENDER. walletAddress:", walletAddress, "profile:", JSON.stringify(profile), "formData:", JSON.stringify(formData));

  useEffect(() => {
    console.log("[Profile] useEffect[walletAddress] triggered. walletAddress:", walletAddress);
    if (walletAddress) {
      fetchProfile();
    }
  }, [walletAddress]);

  const fetchProfile = async () => {
    console.log("[Profile] fetchProfile called. walletAddress:", walletAddress);
    try {
      setLoading(true);
      console.log(`[Profile] fetching /api/profile/${walletAddress}`);
      const res = await api.get(`/profile/${walletAddress}`);
      console.log("[Profile] fetch res.data:", JSON.stringify(res.data));
      if (res.data.profile) {
        console.log("[Profile] calling setProfile with:", JSON.stringify(res.data.profile));
        setProfile(res.data.profile);
        
        const newFormData = {
          name: res.data.profile.name || res.data.user?.name || '',
          headline: res.data.profile.headline || '',
          bio: res.data.profile.bio || '',
          email: res.data.user?.email || ''
        };
        console.log("[Profile] calling setFormData with:", JSON.stringify(newFormData));
        setFormData(newFormData);
      } else {
        console.log("[Profile] res.data.profile is falsy!");
      }
    } catch (err) {
      console.error("[Profile] fetch error:", err);
      if (err.response?.status !== 404) {
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      // If profile doesn't exist yet, it's a POST, otherwise PUT
      const req = profile ? api.put : api.post;
      const res = await req('/profile', formData);
      setProfile(res.data.profile);
      alert('Profile saved!');
    } catch (err) {
      setError('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) return <div>Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-tm-charcoal p-8 rounded-lg shadow-lg border border-gray-800">
      <h2 className="text-2xl font-bold mb-6">Your Profile</h2>
      {error && <div className="text-red-400 mb-4">{error}</div>}
      
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
          <input 
            type="text" 
            className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-white"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
          <input 
            type="email" 
            className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-white"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Headline</label>
          <input 
            type="text" 
            className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-white"
            placeholder="e.g. Senior Software Engineer"
            value={formData.headline}
            onChange={e => setFormData({...formData, headline: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
          <textarea 
            className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-white"
            rows="4"
            value={formData.bio}
            onChange={e => setFormData({...formData, bio: e.target.value})}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-tm-blue hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
