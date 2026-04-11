"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { 
  User, 
  Settings, 
  Users, 
  Link as LinkIcon, 
  Trash2, 
  X, 
  Check, 
  Loader2, 
  AlertTriangle,
  Bell,
  Cpu,
  Smartphone
} from "lucide-react";

type SettingsData = {
  profile: {
    displayName: string;
    email: string;
    phoneNumber: string;
    timezone: string;
    riskSensitivity: number;
    alertFrequencySeconds: number;
    pushAlertsEnabled: boolean;
    emailAlertsEnabled: boolean;
    telegramChatId: string | null;
  };
  children: Array<{
    id: string;
    displayName: string;
    dateOfBirth: string;
  }>;
};

type Tab = "account" | "notifications" | "children" | "integrations" | "advanced";

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // field name being saved
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/parent/settings/full");
      const d = await res.json();
      setData(d);
    } catch (err) {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen, fetchSettings]);

  const updateProfile = async (updates: Partial<SettingsData["profile"]>) => {
    const field = Object.keys(updates)[0];
    setSaving(field);
    try {
      const res = await fetch("/api/parent/profile", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      setData(prev => prev ? { ...prev, profile: { ...prev.profile, ...updates } } : null);
      // Wait a bit to show success state
      setTimeout(() => setSaving(null), 1000);
    } catch {
      setError("Failed to save changes");
      setSaving(null);
    }
  };

  const updateSettings = async (updates: Partial<SettingsData["profile"]>) => {
    const field = Object.keys(updates)[0];
    setSaving(field);
    try {
      const res = await fetch("/api/parent/settings", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      setData(prev => prev ? { ...prev, profile: { ...prev.profile, ...updates } } : null);
      setTimeout(() => setSaving(null), 1000);
    } catch {
      setError("Failed to save settings");
      setSaving(null);
    }
  };

  const updateChild = async (childId: string, updates: Partial<SettingsData["children"][0]>) => {
    const field = `${childId}-${Object.keys(updates)[0]}`;
    setSaving(field);
    try {
      const res = await fetch(`/api/children/${childId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      setData(prev => prev ? {
        ...prev,
        children: prev.children.map(c => c.id === childId ? { ...c, ...updates } : c)
      } : null);
      setTimeout(() => setSaving(null), 1000);
    } catch {
      setError("Failed to update child info");
      setSaving(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure? This will delete all parent data, children, and device history. This action cannot be undone.")) return;
    
    try {
      setLoading(true);
      const res = await fetch("/api/parent/account", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/";
      }
    } catch {
      setError("Failed to delete account");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 top-0 left-0 z-[100] flex h-screen w-screen items-center justify-center p-4 sm:p-6 lg:p-10">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 h-full w-full bg-neutral-950/60 backdrop-blur-md" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative flex h-[min(680px,90vh)] w-full max-w-[920px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-neutral-900">
        
        {/* Sidebar */}
        <aside className="w-[240px] shrink-0 border-r border-neutral-100 bg-neutral-50/80 p-4 dark:border-white/[0.04] dark:bg-neutral-950/60">
          <div className="mb-6 px-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.05em] text-neutral-400 dark:text-neutral-500">
              Settings
            </h2>
          </div>
          <nav className="space-y-1">
            <SidebarItem 
              active={activeTab === "account"} 
              icon={<User size={15} />} 
              label="My Account" 
              onClick={() => setActiveTab("account")} 
            />
            <SidebarItem 
              active={activeTab === "notifications"} 
              icon={<Bell size={15} />} 
              label="Safety & Alerts" 
              onClick={() => setActiveTab("notifications")} 
            />
            <SidebarItem 
              active={activeTab === "children"} 
              icon={<Users size={15} />} 
              label="Children" 
              onClick={() => setActiveTab("children")} 
            />
            <SidebarItem 
              active={activeTab === "integrations"} 
              icon={<LinkIcon size={15} />} 
              label="Integrations" 
              onClick={() => setActiveTab("integrations")} 
            />
            <div className="py-2" />
            <SidebarItem 
              active={activeTab === "advanced"} 
              icon={<Trash2 size={15} />} 
              label="Advanced" 
              onClick={() => setActiveTab("advanced")} 
              danger
            />
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-neutral-900">
          <header className="flex h-14 items-center justify-between border-b border-neutral-100 px-8 dark:border-white/[0.05]">
            <h3 className="text-[15px] font-bold tracking-tight text-neutral-900 dark:text-white">
              {tabLabels[activeTab]}
            </h3>
            <button 
              onClick={onClose}
              className="rounded-xl p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/[0.08] dark:hover:text-neutral-200"
            >
              <X size={20} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-10 pt-8">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-neutral-300 dark:text-neutral-700" size={28} />
              </div>
            ) : data ? (
              <div className="mx-auto max-w-[560px]">
                {activeTab === "account" && (
                  <AccountSettings 
                    profile={data.profile} 
                    onUpdate={updateProfile} 
                    saving={saving} 
                  />
                )}
                {activeTab === "notifications" && (
                  <NotificationSettings 
                    profile={data.profile} 
                    onUpdate={updateSettings} 
                    saving={saving} 
                  />
                )}
                {activeTab === "children" && (
                  <ChildrenSettings 
                    children={data.children} 
                    onUpdate={updateChild} 
                    saving={saving} 
                  />
                )}
                {activeTab === "integrations" && (
                  <IntegrationsSettings 
                    profile={data.profile} 
                    onUpdate={updateSettings} 
                    saving={saving} 
                  />
                )}
                {activeTab === "advanced" && (
                  <AdvancedSettings 
                    onDelete={handleDeleteAccount} 
                  />
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-neutral-400">
                Failed to load settings data.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const tabLabels: Record<Tab, string> = {
  account: "My Account",
  notifications: "Safety & Notifications",
  children: "Manage Children",
  integrations: "Integrations & Extras",
  advanced: "Advanced"
};

function SidebarItem({ 
  active, 
  icon, 
  label, 
  onClick, 
  danger 
}: { 
  active: boolean; 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all duration-150
        ${active 
          ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.05)] dark:bg-neutral-800 dark:text-white dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)]" 
          : danger 
            ? "text-red-500/80 hover:bg-red-50 dark:hover:bg-red-500/10"
            : "text-neutral-500 hover:bg-neutral-200/40 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-neutral-200"
        }
      `}
    >
      <span className={`transition-colors ${active ? "text-emerald-500" : "text-neutral-400 dark:text-neutral-500"}`}>{icon}</span>
      {label}
    </button>
  );
}

// ─── Account Settings ────────────────────────────────────────────────────────

function AccountSettings({ 
  profile, 
  onUpdate, 
  saving 
}: { 
  profile: SettingsData["profile"]; 
  onUpdate: (u: Partial<SettingsData["profile"]>) => void;
  saving: string | null;
}) {
  return (
    <div className="space-y-8">
      <Section title="Profile Information" description="How you appear to the system and in alerts.">
        <div className="space-y-4">
          <InputGroup 
            label="Display Name" 
            id="displayName"
            defaultValue={profile.displayName}
            onSave={(v) => onUpdate({ displayName: v })}
            saving={saving === "displayName"}
          />
          <div className="space-y-1.5 px-1">
            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-600">Email Address</span>
            <div className="text-[13px] text-neutral-500 dark:text-neutral-400">{profile.email}</div>
          </div>
        </div>
      </Section>

      <Section title="System Identity" description="Regional settings for accurate alerts.">
        <div className="space-y-4">
          <InputGroup 
            label="Phone Number" 
            id="phoneNumber"
            placeholder="+1 555 000 0000"
            defaultValue={profile.phoneNumber}
            onSave={(v) => onUpdate({ phoneNumber: v || null })}
            saving={saving === "phoneNumber"}
          />
          <InputGroup 
            label="System Timezone" 
            id="timezone"
            defaultValue={profile.timezone}
            onSave={(v) => onUpdate({ timezone: v })}
            saving={saving === "timezone"}
          />
        </div>
      </Section>
    </div>
  );
}

// ─── Notification Settings ───────────────────────────────────────────────────

function NotificationSettings({ 
  profile, 
  onUpdate, 
  saving 
}: { 
  profile: SettingsData["profile"]; 
  onUpdate: (u: Partial<SettingsData["profile"]>) => void;
  saving: string | null;
}) {
  return (
    <div className="space-y-8">
      <Section title="Safety Algorithm" description="Adjust how the system evaluates activity risks.">
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-[11.5px] font-semibold text-neutral-700 dark:text-neutral-300">Risk Sensitivity</span>
            <div className="flex gap-2">
              {[1, 2, 3].map((v) => (
                <button
                  key={v}
                  onClick={() => onUpdate({ riskSensitivity: v })}
                  className={`
                    flex-1 rounded-lg border py-2 text-[12px] font-medium transition-all
                    ${profile.riskSensitivity === v 
                      ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400" 
                      : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 dark:border-white/[0.08] dark:bg-neutral-900"
                    }
                  `}
                >
                  {v === 1 ? "Low" : v === 2 ? "Medium" : "High"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              Higher sensitivity triggers alerts for smaller deviations from expected paths.
            </p>
          </div>

          <div className="space-y-2">
             <span className="text-[11.5px] font-semibold text-neutral-700 dark:text-neutral-300">Sync Interval</span>
             <select 
               value={profile.alertFrequencySeconds} 
               onChange={(e) => onUpdate({ alertFrequencySeconds: Number(e.target.value) })}
               className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] dark:border-white/[0.08] dark:bg-neutral-900 dark:text-white"
             >
               <option value={30}>30 Seconds (Real-time)</option>
               <option value={60}>1 Minute (Balanced)</option>
               <option value={300}>5 Minutes (Eco)</option>
             </select>
          </div>
        </div>
      </Section>

      <Section title="Delivery Channels" description="Where you receive urgent alerts.">
        <div className="space-y-1">
          <ToggleGroup 
            label="Push Notifications" 
            active={profile.pushAlertsEnabled} 
            onChange={(v) => onUpdate({ pushAlertsEnabled: v })} 
          />
          <ToggleGroup 
            label="Email Alerts" 
            active={profile.emailAlertsEnabled} 
            onChange={(v) => onUpdate({ emailAlertsEnabled: v })} 
          />
        </div>
      </Section>
    </div>
  );
}

// ─── Children Settings ───────────────────────────────────────────────────────

function ChildrenSettings({ 
  children, 
  onUpdate, 
  saving 
}: { 
  children: SettingsData["children"]; 
  onUpdate: (id: string, u: Partial<SettingsData["children"][0]>) => void;
  saving: string | null;
}) {
  return (
    <div className="space-y-8">
      {children.map(child => (
        <Section 
          key={child.id} 
          title={child.displayName} 
          description="Managed child profile."
        >
          <div className="space-y-4">
            <InputGroup 
              label="Child Display Name" 
              id={`name-${child.id}`}
              defaultValue={child.displayName}
              onSave={(v) => onUpdate(child.id, { displayName: v })}
              saving={saving === `${child.id}-displayName`}
            />
            <InputGroup 
              label="Date of Birth" 
              id={`dob-${child.id}`}
              placeholder="YYYY-MM-DD"
              defaultValue={child.dateOfBirth}
              onSave={(v) => onUpdate(child.id, { dateOfBirth: v || null })}
              saving={saving === `${child.id}-dateOfBirth`}
            />
          </div>
        </Section>
      ))}

      {children.length === 0 && (
        <div className="py-12 text-center text-sm text-neutral-400">
          No children registered yet. Pair a device to start.
        </div>
      )}
    </div>
  );
}

// ─── Integrations Settings ───────────────────────────────────────────────────

function IntegrationsSettings({ 
  profile, 
  onUpdate, 
  saving 
}: { 
  profile: SettingsData["profile"]; 
  onUpdate: (u: Partial<SettingsData["profile"]>) => void;
  saving: string | null;
}) {
  return (
    <div className="space-y-8">
      <Section title="Telegram Integration" description="Connect your account to Telegram for instant group alerts.">
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 dark:border-white/[0.04] dark:bg-neutral-900/40">
           {profile.telegramChatId ? (
             <div className="space-y-4">
               <div className="flex items-center gap-3">
                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
                    <LinkIcon size={20} />
                 </div>
                 <div className="min-w-0 flex-1">
                   <p className="text-[13px] font-semibold text-neutral-900 dark:text-white">Account Linked</p>
                   <p className="truncate text-xs text-neutral-400">ID: {profile.telegramChatId}</p>
                 </div>
               </div>
               <button 
                 onClick={() => onUpdate({ telegramChatId: null })}
                 className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white py-2 text-[12px] font-medium text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:bg-neutral-950 dark:text-red-400 dark:hover:bg-red-500/10"
               >
                 Unlink Telegram
               </button>
             </div>
           ) : (
             <div className="space-y-4 text-center">
               <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-white/5">
                 <LinkIcon size={24} />
               </div>
               <div>
                  <p className="text-[13px] font-semibold text-neutral-900 dark:text-white">Not yet connected</p>
                  <p className="mt-1 text-xs text-neutral-400 px-6">
                    Use our Telegram bot to link your account and receive instant alerts.
                  </p>
               </div>
             </div>
           )}
        </div>
      </Section>
    </div>
  );
}

// ─── Advanced Settings ───────────────────────────────────────────────────────

function AdvancedSettings({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="space-y-8">
      <Section title="Danger Zone" description="Irreversible account actions.">
        <div className="space-y-4">
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 dark:border-red-500/10 dark:bg-red-500/5">
            <h4 className="text-[13px] font-bold text-red-600 dark:text-red-500">Delete Account</h4>
            <p className="mt-1 text-[12px] leading-relaxed text-red-500/80">
              Permanently remove your profile, all child associations, device data, and geofences. This cannot be undone.
            </p>
            <button 
              onClick={onDelete}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 py-2.5 text-[12px] font-bold text-white transition hover:bg-red-600 active:scale-[0.98]"
            >
              <Trash2 size={16} />
              Wipe all data
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Atoms ───────────────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[16px] font-bold tracking-tight text-neutral-900 dark:text-white">{title}</h4>
        <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-400 dark:text-neutral-500">{description}</p>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function InputGroup({ 
  label, 
  id, 
  placeholder, 
  defaultValue, 
  onSave, 
  saving 
}: { 
  label: string; 
  id: string; 
  placeholder?: string; 
  defaultValue: string; 
  onSave: (v: string) => void;
  saving: boolean;
}) {
  const [val, setVal] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  return (
    <div className="relative space-y-2">
      <div className="flex items-center justify-between px-1">
        <label htmlFor={id} className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-neutral-400 dark:text-neutral-500">
          {label}
        </label>
        {saving && (
           <div className="flex items-center gap-1.5 text-emerald-500">
             <span className="text-[10px] font-bold italic">Syncing…</span>
             <Loader2 className="animate-spin" size={10} />
           </div>
        )}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={val}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          if (val !== defaultValue) onSave(val);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") inputRef.current?.blur();
        }}
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[13.5px] font-medium transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 dark:border-white/[0.08] dark:bg-neutral-800/50 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-emerald-500/40"
      />
    </div>
  );
}

function ToggleGroup({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl px-2 py-3 transition hover:bg-neutral-50 dark:hover:bg-white/[0.02]">
      <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <button
        onClick={() => onChange(!active)}
        className={`
          relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200
          ${active ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-800"}
        `}
      >
        <div className={`
          absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
          ${active ? "translate-x-4" : "translate-x-0"}
        `} />
      </button>
    </div>
  );
}
