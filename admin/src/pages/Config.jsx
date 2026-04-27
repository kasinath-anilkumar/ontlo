import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  Shield, 
  Users, 
  Zap, 
  Save, 
  RefreshCcw,
  Globe,
  Bell,
  Lock,
  Eye
} from 'lucide-react';
import adminApi from '../api/admin';

const ConfigPage = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await adminApi.get('/config');
      setConfig(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await adminApi.post('/config/update', config);
      alert("Configuration updated successfully!");
    } catch (err) {
      alert("Failed to update config");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <RefreshCcw className="w-8 h-8 animate-spin text-black opacity-20" />
      <p className="text-[9px] font-black uppercase tracking-[0.2em] animate-pulse opacity-40">Fetching System Parameters...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-black tracking-tight">App Configuration</h1>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Control global application parameters and safety logic.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={fetchConfig} className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition shadow-sm">
              <RefreshCcw className="w-4 h-4 text-black" />
           </button>
           <button 
              onClick={handleUpdate}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
           >
              {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Discovery Gating */}
         <ConfigSection title="Discovery Logic" icon={Eye}>
            <div className="grid grid-cols-2 gap-4">
               <InputField 
                  label="Discovery Radius (km)" 
                  value={config.radius || ''} 
                  onChange={(val) => setConfig({...config, radius: parseInt(val) || 0})} 
               />
               <InputField 
                  label="Max Age Gap (Years)" 
                  value={config.ageGap || ''} 
                  onChange={(val) => setConfig({...config, ageGap: parseInt(val) || 0})} 
               />
            </div>
            <div className="mt-4">
               <ToggleField 
                  label="Boost Premium Discovery" 
                  description="Prioritize premium users in search results" 
                  checked={config.boostPremium} 
                  onChange={(val) => setConfig({...config, boostPremium: val})} 
               />
            </div>
         </ConfigSection>

         {/* Safety Controls */}
         <ConfigSection title="Safety & Content" icon={Shield}>
            <div className="space-y-4">
               <InputField 
                  label="Banned Keywords (Comma separated)" 
                  value={config.bannedKeywords?.join(', ') || ''} 
                  onChange={(val) => setConfig({...config, bannedKeywords: val.split(',').map(s => s.trim())})} 
               />
               <InputField 
                  label="Safety Blur Duration (Seconds)" 
                  value={config.safetyBlurDuration || 3} 
                  onChange={(val) => setConfig({...config, safetyBlurDuration: parseInt(val) || 0})} 
                  type="number"
               />
               <ToggleField 
                  label="Auto-Moderate Chat" 
                  description="Use AI to block offensive messages instantly" 
                  checked={config.autoModerate} 
                  onChange={(val) => setConfig({...config, autoModerate: val})} 
               />
            </div>
         </ConfigSection>

         {/* System Parameters */}
         <ConfigSection title="Platform Limits" icon={Zap}>
            <div className="grid grid-cols-2 gap-4">
               <InputField 
                  label="Max Daily Messages" 
                  value={config.dailyMessageLimit || 50} 
                  onChange={(val) => setConfig({...config, dailyMessageLimit: parseInt(val) || 0})} 
               />
               <InputField 
                  label="Max Bio Length" 
                  value={config.bioMaxLength || 150} 
                  onChange={(val) => setConfig({...config, bioMaxLength: parseInt(val) || 0})} 
               />
            </div>
         </ConfigSection>

         {/* Communication */}
         <ConfigSection title="Communication" icon={Bell}>
            <div className="space-y-4">
               <ToggleField 
                  label="In-App Notifications" 
                  description="Enable global push notifications for all events" 
                  checked={true} 
                  onChange={() => {}} 
               />
               <ToggleField 
                  label="Maintenance Mode" 
                  description="Prevent users from accessing the app temporarily" 
                  checked={config.maintenanceMode} 
                  onChange={(val) => setConfig({...config, maintenanceMode: val})} 
               />
            </div>
         </ConfigSection>
      </div>
    </div>
  );
};

const ConfigSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:border-black/5 transition-all">
     <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gray-50 rounded-lg">
           <Icon className="w-4 h-4 text-black" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
     </div>
     {children}
  </div>
);

const InputField = ({ label, value, onChange, type = "text" }) => (
  <div>
     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">{label}</label>
     <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-50 border-2 border-transparent focus:border-black outline-none px-4 py-3 rounded-xl text-xs font-bold transition-all"
     />
  </div>
);

const ToggleField = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
     <div>
        <p className="text-[11px] font-black text-black">{label}</p>
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{description}</p>
     </div>
     <button 
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-black' : 'bg-gray-300'}`}
     >
        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${checked ? 'left-6' : 'left-1'}`} />
     </button>
  </div>
);

export default ConfigPage;
