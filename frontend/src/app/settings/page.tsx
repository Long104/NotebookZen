"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Key, Cpu, Eye, EyeOff, Check, Loader2, Zap } from "lucide-react";
import { useApi } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type ModelOption = {
  id: string;
  label: string;
  context: number;
  isFree: boolean;
};

type SettingsData = {
  ai_provider: string;
  openrouter_api_key: string;
  openrouter_api_key_set?: boolean;
  openrouter_model: string;
  google_api_key: string;
  google_api_key_set?: boolean;
  google_model: string;
};

const PROVIDERS = [
  {
    id: "openrouter",
    name: "OpenRouter",
    desc: "100+ models via one API",
    keyPlaceholder: "sk-or-...",
    modelsUrl: "/api/models/openrouter",
  },
  {
    id: "google",
    name: "Google AI",
    desc: "Gemini models directly",
    keyPlaceholder: "AIza...",
    modelsUrl: "/api/models/google",
  },
] as const;

export default function SettingsPage() {
  const signedIn = useRequireAuth();
  const api = useApi();

  const [settings, setSettings] = useState<SettingsData>({
    ai_provider: "openrouter",
    openrouter_api_key: "",
    openrouter_api_key_set: false,
    openrouter_model: "meta-llama/llama-3.3-70b-instruct:free",
    google_api_key: "",
    google_api_key_set: false,
    google_model: "gemini-2.0-flash",
  });

  // Per-provider model lists fetched from backend
  const [openrouterModels, setOpenrouterModels] = useState<ModelOption[]>([]);
  const [googleModels, setGoogleModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState<Record<string, boolean>>({
    openrouter: false,
    google: false,
  });

  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Fetch saved settings on mount ──
  useEffect(() => {
    if (signedIn) {
      fetchSettings();
    }
  }, [signedIn]);

  // ── Fetch model lists when provider changes ──
  useEffect(() => {
    if (!signedIn) return;
    const provider = settings.ai_provider;
    if (provider === "openrouter" && openrouterModels.length === 0) {
      fetchModels("openrouter");
    }
    if (provider === "google" && googleModels.length === 0) {
      fetchModels("google");
    }
  }, [signedIn, settings.ai_provider]);

  async function fetchSettings() {
    try {
      const res = await api("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({
          ...prev,
          ...data,
          openrouter_api_key: "",
          google_api_key: "",
          openrouter_api_key_set: data.openrouter_api_key_set || false,
          google_api_key_set: data.google_api_key_set || false,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchModels(provider: string) {
    setModelsLoading((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await api(`/api/models/${provider}`);
      if (res.ok) {
        const data = await res.json();
        if (provider === "openrouter") {
          setOpenrouterModels(data.models || []);
        } else {
          setGoogleModels(data.models || []);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${provider} models:`, err);
    } finally {
      setModelsLoading((prev) => ({ ...prev, [provider]: false }));
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const toSave: Record<string, string> = {
        ai_provider: settings.ai_provider,
      };

      if (settings.ai_provider === "openrouter") {
        toSave.openrouter_model = settings.openrouter_model;
        if (settings.openrouter_api_key) {
          toSave.openrouter_api_key = settings.openrouter_api_key;
        }
      } else {
        toSave.google_model = settings.google_model;
        if (settings.google_api_key) {
          toSave.google_api_key = settings.google_api_key;
        }
      }

      const res = await api("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: toSave }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved!" });
        await fetchSettings();
      } else {
        const data = await res.json();
        setMessage({
          type: "error",
          text: data.error || "Failed to save settings",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof SettingsData, value: string) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  if (!signedIn) return null;

  // Current provider config
  const activeProvider = PROVIDERS.find((p) => p.id === settings.ai_provider)!;
  const isKeySet =
    settings.ai_provider === "openrouter"
      ? settings.openrouter_api_key_set
      : settings.google_api_key_set;
  const currentModel =
    settings.ai_provider === "openrouter" ? settings.openrouter_model : settings.google_model;

  // Model list for active provider
  const modelList = settings.ai_provider === "openrouter" ? openrouterModels : googleModels;
  const isModelsLoading = modelsLoading[settings.ai_provider] || false;

  // Label for current model
  const currentModelLabel = modelList.find((m) => m.id === currentModel)?.label || currentModel;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-[var(--zen-surface)]">
          <Navbar />

          <main className="max-w-2xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <Settings size={20} className="text-[var(--zen-on-surface-variant)]" />
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--zen-on-surface)]">
                  AI Settings
                </h1>
              </div>
              <p className="text-sm text-[var(--zen-on-surface-variant)] leading-relaxed">
                Bring your own key — connect your AI provider to power the chat assistant. Your keys
                are stored securely and never shared.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[var(--zen-on-surface-variant)]" size={24} />
              </div>
            ) : (
              <div className="space-y-8">
                {/* ── Current Configuration Card ── */}
                <div className="rounded-xl border border-[var(--zen-outline-variant)] bg-[var(--zen-surface-low)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={14} className="text-[var(--zen-primary)]" />
                    <span className="text-xs font-medium tracking-widest uppercase text-[var(--zen-on-surface-variant)]">
                      Current Configuration
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--zen-on-surface-variant)] mb-1">
                        Provider
                      </div>
                      <div className="text-sm font-medium text-[var(--zen-on-surface)]">
                        {activeProvider.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--zen-on-surface-variant)] mb-1">
                        Model
                      </div>
                      <div
                        className="text-sm font-medium text-[var(--zen-on-surface)] truncate"
                        title={currentModel}
                      >
                        {currentModelLabel}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--zen-on-surface-variant)] mb-1">
                        API Key
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isKeySet ? (
                          <>
                            <Check size={14} className="text-[var(--zen-primary)]" />
                            <span className="text-sm font-medium text-[var(--zen-on-surface)]">
                              Connected
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-[var(--zen-error)]">Not set</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Provider Selection ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu size={16} className="text-[var(--zen-on-surface-variant)]" />
                    <span className="text-xs font-medium tracking-widest uppercase text-[var(--zen-on-surface-variant)]">
                      AI Provider
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {PROVIDERS.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => updateField("ai_provider", provider.id)}
                        className={`relative p-4 rounded-xl text-left transition-all duration-300 cursor-pointer
                          ${
                            settings.ai_provider === provider.id
                              ? "bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)]"
                              : "bg-[var(--zen-surface-low)] text-[var(--zen-on-surface-variant)] hover:bg-[var(--zen-surface-high)]"
                          }`}
                      >
                        {settings.ai_provider === provider.id && (
                          <Check
                            size={14}
                            className="absolute top-3 right-3 text-[var(--zen-primary)]"
                          />
                        )}
                        <div className="font-medium text-sm">{provider.name}</div>
                        <div className="text-xs mt-1 opacity-70">{provider.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* ── API Key ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Key size={16} className="text-[var(--zen-on-surface-variant)]" />
                    <span className="text-xs font-medium tracking-widest uppercase text-[var(--zen-on-surface-variant)]">
                      {activeProvider.name} API Key
                    </span>
                    {isKeySet && (
                      <span className="text-[10px] bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)] px-2 py-0.5 rounded-full ml-2">
                        Key saved
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder={
                        isKeySet
                          ? "Enter new key to replace saved key"
                          : activeProvider.keyPlaceholder
                      }
                      value={
                        settings.ai_provider === "openrouter"
                          ? settings.openrouter_api_key
                          : settings.google_api_key
                      }
                      onChange={(e) =>
                        updateField(
                          settings.ai_provider === "openrouter"
                            ? "openrouter_api_key"
                            : "google_api_key",
                          e.target.value,
                        )
                      }
                      className="pr-10 bg-[var(--zen-surface-lowest)] border-[var(--zen-outline-variant)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--zen-on-surface-variant)] hover:text-[var(--zen-on-surface)] transition-colors"
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </section>

                {/* ── Model Selection ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu size={16} className="text-[var(--zen-on-surface-variant)]" />
                    <span className="text-xs font-medium tracking-widest uppercase text-[var(--zen-on-surface-variant)]">
                      Model ({activeProvider.name})
                    </span>
                  </div>

                  {isModelsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--zen-on-surface-variant)]">
                      <Loader2 size={14} className="animate-spin" />
                      Loading available models...
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={currentModel}
                        onChange={(e) =>
                          updateField(
                            settings.ai_provider === "openrouter"
                              ? "openrouter_model"
                              : "google_model",
                            e.target.value,
                          )
                        }
                        className="w-full h-9 rounded-md bg-[var(--zen-surface-lowest)] border border-[var(--zen-outline-variant)] px-3 text-sm text-[var(--zen-on-surface)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--zen-primary)]/30 focus:border-[var(--zen-primary)]"
                      >
                        {/* If current model not in list, show it at top */}
                        {!modelList.find((m) => m.id === currentModel) && (
                          <option value={currentModel}>{currentModel} (current)</option>
                        )}
                        {/* Free models group */}
                        {modelList.some((m) => m.isFree) && (
                          <optgroup label="── Free Models ──">
                            {modelList
                              .filter((m) => m.isFree)
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.label} ({Math.round(m.context / 1000)}k)
                                </option>
                              ))}
                          </optgroup>
                        )}
                        {/* Paid models group */}
                        {modelList.some((m) => !m.isFree) && (
                          <optgroup label="── Paid Models ──">
                            {modelList
                              .filter((m) => !m.isFree)
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.label} ({Math.round(m.context / 1000)}k)
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--zen-on-surface-variant)]">
                        ▾
                      </div>
                    </div>
                  )}

                  {/* Custom model input */}
                  <div>
                    <label className="text-xs text-[var(--zen-on-surface-variant)] mb-1 block">
                      Or enter a custom model ID
                    </label>
                    <Input
                      type="text"
                      placeholder={
                        settings.ai_provider === "openrouter"
                          ? "e.g. meta-llama/llama-3.3-70b-instruct:free"
                          : "e.g. gemini-2.0-flash-lite"
                      }
                      value={currentModel}
                      onChange={(e) =>
                        updateField(
                          settings.ai_provider === "openrouter"
                            ? "openrouter_model"
                            : "google_model",
                          e.target.value,
                        )
                      }
                      className="bg-[var(--zen-surface-lowest)] border-[var(--zen-outline-variant)]"
                    />
                  </div>
                </section>

                {/* ── Save Button ── */}
                <div className="pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[var(--zen-primary)] text-[var(--zen-on-primary)] hover:bg-[var(--zen-primary)]/90 px-8 rounded-full transition-all duration-300"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>

                  {message && (
                    <p
                      className={`mt-3 text-sm ${
                        message.type === "success"
                          ? "text-[var(--zen-primary)]"
                          : "text-[var(--zen-error)]"
                      }`}
                    >
                      {message.text}
                    </p>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
