"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Key, Cpu, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { useApi } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

type SettingsData = {
  ai_provider: string;
  openrouter_api_key: string;
  openrouter_api_key_set?: boolean;
  openrouter_model: string;
  google_api_key: string;
  google_api_key_set?: boolean;
  google_model: string;
};

const OPENROUTER_MODELS = [
  { value: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)" },
  { value: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash Preview" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 (Free)" },
];

const GOOGLE_MODELS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash Preview" },
  { value: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro Preview" },
];

export default function SettingsPage() {
  const signedIn = useRequireAuth();
  const api = useApi();

  const [settings, setSettings] = useState<SettingsData>({
    ai_provider: "openrouter",
    openrouter_api_key: "",
    openrouter_api_key_set: false,
    openrouter_model: "google/gemini-2.0-flash-exp:free",
    google_api_key: "",
    google_api_key_set: false,
    google_model: "gemini-2.0-flash",
  });

  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (signedIn) {
      fetchSettings();
    }
  }, [signedIn]);

  async function fetchSettings() {
    try {
      const res = await api("/api/settings");

      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({
          ...prev,
          ...data,
          // Don't overwrite masked keys into state — keep empty so user types new ones
          openrouter_api_key: data.openrouter_api_key_set ? "" : "",
          google_api_key: data.google_api_key_set ? "" : "",
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

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      // Only send fields that the user actually changed
      const toSave: Record<string, string> = {
        ai_provider: settings.ai_provider,
      };

      // Always send model so it stays in sync
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
        setMessage({ type: "success", text: "Settings saved successfully!" });
        // Refresh to get masked values
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

  const models =
    settings.ai_provider === "openrouter" ? OPENROUTER_MODELS : GOOGLE_MODELS;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-[var(--zen-surface)]">
          <Navbar />

          <main className="max-w-2xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-2">
                <Settings
                  size={20}
                  className="text-[var(--zen-on-surface-variant)]"
                />
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--zen-on-surface)]">
                  AI Settings
                </h1>
              </div>
              <p className="text-sm text-[var(--zen-on-surface-variant)] leading-relaxed">
                Bring your own key — connect your AI provider to power the chat
                assistant. Your keys are stored securely and never shared.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[var(--zen-on-surface-variant)]" size={24} />
              </div>
            ) : (
              <div className="space-y-10">
                {/* ── Provider Selection ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu
                      size={16}
                      className="text-[var(--zen-on-surface-variant)]"
                    />
                    <span className="text-xs font-medium tracking-widest uppercase text-[var(--zen-on-surface-variant)]">
                      AI Provider
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {["openrouter", "google"].map((provider) => (
                      <button
                        key={provider}
                        onClick={() => updateField("ai_provider", provider)}
                        className={`
                          relative p-4 rounded-xl text-left transition-all duration-300 cursor-pointer
                          ${
                            settings.ai_provider === provider
                              ? "bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)]"
                              : "bg-[var(--zen-surface-low)] text-[var(--zen-on-surface-variant)] hover:bg-[var(--zen-surface-high)]"
                          }
                        `}
                      >
                        {settings.ai_provider === provider && (
                          <Check
                            size={14}
                            className="absolute top-3 right-3 text-[var(--zen-primary)]"
                          />
                        )}
                        <div className="font-medium text-sm capitalize">
                          {provider === "openrouter"
                            ? "OpenRouter"
                            : "Google AI"}
                        </div>
                        <div className="text-xs mt-1 opacity-70">
                          {provider === "openrouter"
                            ? "Access 100+ models via one API"
                            : "Gemini models directly"}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* ── API Key ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Key
                      size={16}
                      className="text-[var(--zen-on-surface-variant)]"
                    />
                    <span className="text-xs font-medium tracking-widest uppercase text-[var(--zen-on-surface-variant)]">
                      API Key
                    </span>
                    {(settings.ai_provider === "openrouter" &&
                      settings.openrouter_api_key_set) ||
                    (settings.ai_provider === "google" &&
                      settings.google_api_key_set) ? (
                      <span className="text-[10px] bg-[var(--zen-primary-container)] text-[var(--zen-on-primary-container)] px-2 py-0.5 rounded-full ml-2">
                        Key saved
                      </span>
                    ) : null}
                  </div>

                  <div className="relative">
                    <Input
                      type={
                        showOpenrouterKey || showGoogleKey ? "text" : "password"
                      }
                      placeholder={
                        settings.ai_provider === "openrouter"
                          ? settings.openrouter_api_key_set
                            ? "Enter new key to replace saved key"
                            : "sk-or-..."
                          : settings.google_api_key_set
                            ? "Enter new key to replace saved key"
                            : "AIza..."
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
                      onClick={() => {
                        if (settings.ai_provider === "openrouter") {
                          setShowOpenrouterKey(!showOpenrouterKey);
                        } else {
                          setShowGoogleKey(!showGoogleKey);
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--zen-on-surface-variant)] hover:text-[var(--zen-on-surface)] transition-colors"
                    >
                      {(settings.ai_provider === "openrouter" && showOpenrouterKey) ||
                      (settings.ai_provider === "google" && showGoogleKey) ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                  </div>
                </section>

                {/* ── Model Selection ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu
                      size={16}
                      className="text-[var(--zen-on-surface-variant)]"
                    />
                    <span className="text-xs font-medium tracking-widest uppercase text-[var(--zen-on-surface-variant)]">
                      Model
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      value={
                        settings.ai_provider === "openrouter"
                          ? settings.openrouter_model
                          : settings.google_model
                      }
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
                      {models.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--zen-on-surface-variant)]">
                      ▾
                    </div>
                  </div>

                  {/* Custom model input */}
                  <div>
                    <label className="text-xs text-[var(--zen-on-surface-variant)] mb-1 block">
                      Or enter a custom model name
                    </label>
                    <Input
                      type="text"
                      placeholder={
                        settings.ai_provider === "openrouter"
                          ? "e.g. openai/gpt-4o"
                          : "e.g. gemini-2.0-flash-lite"
                      }
                      value={
                        settings.ai_provider === "openrouter"
                          ? settings.openrouter_model
                          : settings.google_model
                      }
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
