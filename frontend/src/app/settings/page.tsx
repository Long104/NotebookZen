"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Eye, EyeOff, Loader2, Plus, Trash2, Zap, Edit3 } from "lucide-react";
import { useApi } from "@/lib/api";

type ModelOption = {
  id: string;
  label: string;
  context: number;
  isFree: boolean;
};

type AiConfig = {
  id: string;
  name: string;
  provider: "openrouter" | "google";
  model: string;
  apiKey: string;
  apiKeySet?: boolean;
};

const PROVIDERS = [
  {
    id: "openrouter" as const,
    name: "OpenRouter",
    desc: "100+ models via one API",
    keyPlaceholder: "sk-or-...",
  },
  {
    id: "google" as const,
    name: "Google AI",
    desc: "Gemini models directly",
    keyPlaceholder: "AIza...",
  },
];

function genId() {
  return "cfg_" + Math.random().toString(36).slice(2, 10);
}

export default function SettingsPage() {
  const api = useApi();

  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Model lists per provider
  const [modelLists, setModelLists] = useState<Record<string, ModelOption[]>>({
    openrouter: [],
    google: [],
  });
  const [modelsLoading, setModelsLoading] = useState<Record<string, boolean>>({
    openrouter: false,
    google: false,
  });

  useEffect(() => {
    fetchSettings();
    fetchModels("openrouter");
    fetchModels("google");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSettings() {
    try {
      const res = await api("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
        setActiveConfigId(data.activeConfigId || null);
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
        setModelLists((prev) => ({
          ...prev,
          [provider]: data.models || [],
        }));
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
      const res = await api("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configs: configs.map((c) => ({
            id: c.id,
            name: c.name,
            provider: c.provider,
            model: c.model,
            apiKey: c.apiKey,
          })),
          activeConfigId,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved!" });
        setEditingId(null);
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

  function addConfig(provider: "openrouter" | "google") {
    const newConfig: AiConfig = {
      id: genId(),
      name: PROVIDERS.find((p) => p.id === provider)!.name,
      provider,
      model:
        provider === "openrouter" ? "meta-llama/llama-3.3-70b-instruct:free" : "gemini-2.0-flash",
      apiKey: "",
    };
    setConfigs((prev) => [...prev, newConfig]);
    setActiveConfigId(newConfig.id);
    setEditingId(newConfig.id);
  }

  function updateConfig(id: string, field: keyof AiConfig, value: string) {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function deleteConfig(id: string) {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    if (activeConfigId === id) {
      setActiveConfigId(configs.find((c) => c.id !== id)?.id || null);
    }
  }

  function activateConfig(id: string) {
    setActiveConfigId(id);
  }

  const activeConfig = configs.find((c) => c.id === activeConfigId);

  return (
    <AppLayout>
      <div className="min-h-full bg-[var(--zen-surface)]">
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
              Save multiple AI configurations. Switch between them anytime — handy when a free model
              hits its daily limit.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-[var(--zen-on-surface-variant)]" size={24} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── Active Config Banner ── */}
              {activeConfig && (
                <div className="rounded-xl border border-[var(--zen-outline-variant)] bg-[var(--zen-surface-low)] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-[var(--zen-primary)]" />
                    <span className="text-xs font-medium tracking-widest uppercase text-[var(--zen-on-surface-variant)]">
                      Active Now
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-[var(--zen-on-surface)]">
                        {activeConfig.name}
                      </span>
                      <span className="text-xs text-[var(--zen-on-surface-variant)] ml-2">
                        {activeConfig.model}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)] capitalize">
                      {activeConfig.provider}
                    </span>
                  </div>
                </div>
              )}

              {/* ── Config List ── */}
              {configs.map((cfg) => {
                const isActive = cfg.id === activeConfigId;
                const isEditing = cfg.id === editingId;
                const models = modelLists[cfg.provider] || [];
                const providerInfo = PROVIDERS.find((p) => p.id === cfg.provider)!;

                return (
                  <div
                    key={cfg.id}
                    className={`rounded-xl border transition-all duration-200 ${
                      isActive
                        ? "border-[var(--zen-primary)] bg-[var(--zen-surface-low)]"
                        : "border-[var(--zen-outline-variant)] bg-[var(--zen-surface)]"
                    }`}
                  >
                    {/* Config header — collapsed view */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => !isEditing && activateConfig(cfg.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Radio-like indicator */}
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isActive
                              ? "border-[var(--zen-primary)]"
                              : "border-[var(--zen-outline-variant)]"
                          }`}
                        >
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-[var(--zen-primary)]" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--zen-on-surface)]">
                            {cfg.name}
                          </div>
                          <div className="text-xs text-[var(--zen-on-surface-variant)]">
                            {cfg.model}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cfg.apiKeySet && (
                          <span className="text-[10px] bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)] px-2 py-0.5 rounded-full">
                            Key set
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(isEditing ? null : cfg.id);
                          }}
                          className="text-[var(--zen-on-surface-variant)] hover:text-[var(--zen-on-surface)] transition-colors p-1"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConfig(cfg.id);
                          }}
                          className="text-[var(--zen-on-surface-variant)] hover:text-[var(--zen-error)] transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded edit view */}
                    {isEditing && (
                      <div className="px-4 pb-4 space-y-4 border-t border-[var(--zen-outline-variant)] pt-4">
                        {/* Name */}
                        <div>
                          <label className="text-xs text-[var(--zen-on-surface-variant)] mb-1 block">
                            Config Name
                          </label>
                          <Input
                            type="text"
                            value={cfg.name}
                            onChange={(e) => updateConfig(cfg.id, "name", e.target.value)}
                            placeholder="e.g. Llama 70B Free"
                            className="bg-[var(--zen-surface-lowest)] border-[var(--zen-outline-variant)]"
                          />
                        </div>

                        {/* Provider */}
                        <div>
                          <label className="text-xs text-[var(--zen-on-surface-variant)] mb-1 block">
                            Provider
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {PROVIDERS.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => updateConfig(cfg.id, "provider", p.id)}
                                className={`p-3 rounded-lg text-left text-sm transition-all ${
                                  cfg.provider === p.id
                                    ? "bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)]"
                                    : "bg-[var(--zen-surface-low)] text-[var(--zen-on-surface-variant)]"
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* API Key */}
                        <div>
                          <label className="text-xs text-[var(--zen-on-surface-variant)] mb-1 block">
                            API Key{" "}
                            {cfg.apiKeySet && (
                              <span className="text-[var(--zen-primary)]">
                                (saved — enter new to replace)
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <Input
                              type={showKey[cfg.id] ? "text" : "password"}
                              value={cfg.apiKey}
                              onChange={(e) => updateConfig(cfg.id, "apiKey", e.target.value)}
                              placeholder={
                                cfg.apiKeySet ? "•••••••• (saved)" : providerInfo.keyPlaceholder
                              }
                              className="pr-10 bg-[var(--zen-surface-lowest)] border-[var(--zen-outline-variant)]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowKey((prev) => ({
                                  ...prev,
                                  [cfg.id]: !prev[cfg.id],
                                }))
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--zen-on-surface-variant)] hover:text-[var(--zen-on-surface)]"
                            >
                              {showKey[cfg.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Model */}
                        <div>
                          <label className="text-xs text-[var(--zen-on-surface-variant)] mb-1 block">
                            Model
                          </label>
                          {modelsLoading[cfg.provider] ? (
                            <div className="flex items-center gap-2 text-sm text-[var(--zen-on-surface-variant)]">
                              <Loader2 size={14} className="animate-spin" />
                              Loading models...
                            </div>
                          ) : (
                            <div className="relative">
                              <select
                                value={cfg.model}
                                onChange={(e) => updateConfig(cfg.id, "model", e.target.value)}
                                className="w-full h-9 rounded-md bg-[var(--zen-surface-lowest)] border border-[var(--zen-outline-variant)] px-3 text-sm text-[var(--zen-on-surface)] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--zen-primary)]/30"
                              >
                                {!models.find((m) => m.id === cfg.model) && (
                                  <option value={cfg.model}>{cfg.model} (current)</option>
                                )}
                                {models.some((m) => m.isFree) && (
                                  <optgroup label="── Free ──">
                                    {models
                                      .filter((m) => m.isFree)
                                      .map((m) => (
                                        <option key={m.id} value={m.id}>
                                          {m.label} ({Math.round(m.context / 1000)}k)
                                        </option>
                                      ))}
                                  </optgroup>
                                )}
                                {models.some((m) => !m.isFree) && (
                                  <optgroup label="── Paid ──">
                                    {models
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
                          <Input
                            type="text"
                            value={cfg.model}
                            onChange={(e) => updateConfig(cfg.id, "model", e.target.value)}
                            placeholder="Or type a custom model ID"
                            className="mt-2 bg-[var(--zen-surface-lowest)] border-[var(--zen-outline-variant)] text-sm"
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="text-xs"
                        >
                          Done
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Add Config Buttons ── */}
              <div className="flex gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addConfig(p.id)}
                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[var(--zen-outline-variant)] text-sm text-[var(--zen-on-surface-variant)] hover:bg-[var(--zen-surface-low)] hover:border-[var(--zen-primary)] transition-all"
                  >
                    <Plus size={14} />
                    Add {p.name}
                  </button>
                ))}
              </div>

              {/* ── Save Button ── */}
              <div className="pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving || configs.length === 0}
                  className="bg-[var(--zen-primary)] text-[var(--zen-on-primary)] hover:bg-[var(--zen-primary)]/90 px-8 rounded-full"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save All"
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
    </AppLayout>
  );
}
