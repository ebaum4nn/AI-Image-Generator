"use client";
import React, { useEffect, useState } from "react";

interface WatermarkSettings {
  id: number;
  visible_enabled: boolean;
  hidden_enabled: boolean;
  visible_text_template: string;
  hidden_key: string;
  visible_position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  visible_opacity: number;
  visible_bar: boolean;
  font_scale: number;
  visible_font_family?: string | null;
  visible_font_data_url?: string | null;
  updated_at?: string;
}

const SAMPLE = {
  email: "user@example.com",
  timestamp: new Date().toISOString(),
  filename: "flux_12345_sample.png",
};

function renderTemplate(tpl: string) {
  return tpl
    .replaceAll("{email}", SAMPLE.email)
    .replaceAll("{timestamp}", SAMPLE.timestamp)
    .replaceAll("{filename}", SAMPLE.filename);
}

export default function WatermarksAdminPage() {
  const [settings, setSettings] = useState<WatermarkSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adminToken, setAdminToken] = useState<string>('');
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [showGuides, setShowGuides] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (adminToken) headers['X-Admin-Token'] = adminToken;
        const res = await fetch("/api/admin/watermarks", { credentials: "include", headers });
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        setSettings(data);
      } catch (e: any) {
        setError(e.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adminToken]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/watermarks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
        // Add admin token header if provided
        ...(adminToken ? { headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken } } : {}),
      });
      if (!res.ok) throw new Error("Failed to save settings");
    } catch (e: any) {
      setError(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading watermark settings...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!settings) return <div className="p-8">No settings found.</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Watermark Settings</h1>
      <p className="text-sm text-gray-300">Configure visible and hidden watermarks applied to generated images.</p>

      <div className="p-4 border rounded bg-black text-white">
        <h2 className="text-lg font-semibold mb-2">Admin Token</h2>
        <p className="text-xs text-gray-400 mb-2">If the API requires an admin token, enter it here. It will be used for loading and saving settings.</p>
        <input
          type="text"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          className="w-full px-3 py-2 border rounded bg-gray-900 text-white placeholder-gray-400"
          placeholder="Optional X-Admin-Token"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 border rounded bg-black text-white">
          <h2 className="text-lg font-semibold mb-3">Visible Watermark</h2>
          <label className="flex items-center gap-2 mb-3 text-sm">
            <input
              type="checkbox"
              checked={settings.visible_enabled}
              onChange={(e) => setSettings({ ...settings, visible_enabled: e.target.checked })}
            />
            Enable visible watermark
          </label>
          <label className="block text-sm mb-1">Text template</label>
          <input
            type="text"
            value={settings.visible_text_template}
            onChange={(e) => setSettings({ ...settings, visible_text_template: e.target.value })}
            className="w-full px-3 py-2 border rounded bg-gray-900 text-white placeholder-gray-400"
            placeholder="Image Generator • {email} • {timestamp}"
          />
          <p className="text-xs text-gray-400 mt-2">Available tokens: {"{email}"}, {"{timestamp}"}, {"{filename}"}</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="text-sm">Position
              <select
                className="mt-1 w-full px-2 py-1 bg-gray-900 border rounded"
                value={settings.visible_position}
                onChange={(e) => setSettings({ ...settings, visible_position: e.target.value as any })}
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
              </select>
            </label>
            <label className="text-sm">Opacity
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                className="mt-1 w-full px-2 py-1 bg-gray-900 border rounded"
                value={settings.visible_opacity}
                onChange={(e) => setSettings({ ...settings, visible_opacity: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">Font scale
              <input
                type="number"
                min={0.01}
                max={0.1}
                step={0.005}
                className="mt-1 w-full px-2 py-1 bg-gray-900 border rounded"
                value={settings.font_scale}
                onChange={(e) => setSettings({ ...settings, font_scale: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm flex items-center gap-2">Show bar
              <input
                type="checkbox"
                checked={settings.visible_bar}
                onChange={(e) => setSettings({ ...settings, visible_bar: e.target.checked })}
              />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <label className="text-sm">Font family
              <input
                type="text"
                className="mt-1 w-full px-2 py-1 bg-gray-900 border rounded"
                value={settings.visible_font_family || ''}
                onChange={(e) => setSettings({ ...settings, visible_font_family: e.target.value })}
                placeholder="e.g. Inter, Arial, Helvetica, sans-serif"
              />
            </label>
            <label className="text-sm">Upload font (TTF/OTF)
              <input
                type="file"
                accept=".ttf,.otf,font/ttf,font/otf"
                className="mt-1 w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = String(reader.result || '');
                    setSettings({ ...settings, visible_font_data_url: dataUrl });
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          <div className="mt-3 p-3 bg-gray-800 rounded">
            <div className="text-xs text-gray-400 mb-1">Preview</div>
            <div className="text-sm">{renderTemplate(settings.visible_text_template)}</div>
          </div>
        </div>

        <div className="p-4 border rounded bg-black text-white">
          <h2 className="text-lg font-semibold mb-3">Hidden Watermark</h2>
          <label className="flex items-center gap-2 mb-3 text-sm">
            <input
              type="checkbox"
              checked={settings.hidden_enabled}
              onChange={(e) => setSettings({ ...settings, hidden_enabled: e.target.checked })}
            />
            Enable hidden PNG text chunk
          </label>
          <label className="block text-sm mb-1">Chunk key</label>
          <input
            type="text"
            value={settings.hidden_key}
            onChange={(e) => setSettings({ ...settings, hidden_key: e.target.value })}
            className="w-full px-3 py-2 border rounded bg-gray-900 text-white placeholder-gray-400"
            placeholder="watermark"
          />
          <p className="text-xs text-gray-400 mt-2">Hidden payload includes user email, ISO timestamp, filename, and prompt hash.</p>
        </div>
      </div>

      {/* Visual placement preview */}
      <div className="p-4 border rounded bg-black text-white">
        <h2 className="text-lg font-semibold mb-2">Visual Preview</h2>
        <p className="text-xs text-gray-400 mb-3">A simulated canvas to visualize bar and text placement before saving.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-sm block mb-1">Background image</label>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setBackgroundUrl(String(reader.result || ''));
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => setBackgroundUrl('')}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Clear background
            </button>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} />
              Show guides
            </label>
          </div>
        </div>
        <PreviewCanvas
          text={renderTemplate(settings.visible_text_template)}
          position={settings.visible_position}
          opacity={settings.visible_opacity}
          showBar={settings.visible_bar}
          fontScale={settings.font_scale}
          enabled={settings.visible_enabled}
          backgroundUrl={backgroundUrl}
          showGuides={showGuides}
          fontFamily={settings.visible_font_family || ''}
          fontDataUrl={settings.visible_font_data_url || ''}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {settings.updated_at && (
          <span className="text-xs text-gray-400">Last updated: {new Date(settings.updated_at).toLocaleString()}</span>
        )}
      </div>

      <div className="p-4 border rounded bg-black text-white">
        <h3 className="font-semibold mb-2">Notes</h3>
        <ul className="list-disc pl-5 text-sm space-y-1 text-gray-300">
          <li>Visible watermark is rendered as a translucent bar on the bottom-right.</li>
          <li>Hidden watermark is stored in a PNG tEXt chunk with the configured key.</li>
          <li>Future updates will allow the generator to use these settings live.</li>
        </ul>
      </div>
    </div>
  );
}

function PreviewCanvas(props: {
  text: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  opacity: number;
  showBar: boolean;
  fontScale: number;
  enabled: boolean;
  backgroundUrl?: string;
  showGuides?: boolean;
  fontFamily?: string;
  fontDataUrl?: string;
}) {
  const { text, position, opacity, showBar, fontScale, enabled, backgroundUrl, showGuides, fontFamily, fontDataUrl } = props;
  const width = 512;
  const height = 512;
  const padding = Math.max(10, Math.round(width * 0.02));
  const fontSize = Math.max(12, Math.round(width * fontScale));

  const isTop = position.startsWith('top');
  const isRight = position.endsWith('right');

  const barStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: fontSize + padding * 2,
    backgroundColor: `rgba(0,0,0,${opacity})`,
    top: isTop ? 0 : undefined,
    bottom: isTop ? undefined : 0,
    display: showBar && enabled ? 'block' : 'none',
  };

  const textStyle: React.CSSProperties = {
    position: 'absolute',
    fontSize,
    color: 'rgba(255,255,255,' + Math.min(1, opacity + 0.55) + ')',
    top: isTop ? padding : undefined,
    bottom: isTop ? undefined : padding,
    left: isRight ? undefined : padding,
    right: isRight ? padding : undefined,
    textAlign: isRight ? 'right' : 'left',
    display: enabled ? 'block' : 'none',
    fontFamily: fontFamily && fontFamily.trim().length > 0 ? fontFamily : undefined,
  };

  return (
    <div className="mt-2">
      <div
        className="relative"
        style={{ width, height, background: backgroundUrl ? undefined : 'linear-gradient(135deg, #222 0%, #333 50%, #222 100%)', borderRadius: 8, overflow: 'hidden' }}
      >
        {/* Inject font-face for preview when a data URL is provided */}
        {fontDataUrl && (
          <style dangerouslySetInnerHTML={{ __html: `@font-face { font-family: 'WMPreviewFont'; src: url(${fontDataUrl}) format('truetype'); font-weight: normal; font-style: normal; }` }} />
        )}
        {backgroundUrl && (
          <img src={backgroundUrl} alt="Background preview" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div style={barStyle} />
        <div style={{ ...textStyle, fontFamily: fontDataUrl ? 'WMPreviewFont' : textStyle.fontFamily }}>{text}</div>
        {/* Corner markers for orientation */}
        <div className="absolute top-2 left-2 text-xs text-gray-400">TL</div>
        <div className="absolute top-2 right-2 text-xs text-gray-400">TR</div>
        <div className="absolute bottom-2 left-2 text-xs text-gray-400">BL</div>
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">BR</div>
        {showGuides && (
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            {Array.from({ length: Math.floor(width / 64) - 1 }, (_, i) => {
              const x = (i + 1) * 64;
              return <line key={'v' + x} x1={x} y1={0} x2={x} y2={height} stroke="rgba(255,255,255,0.1)" />
            })}
            {Array.from({ length: Math.floor(height / 64) - 1 }, (_, i) => {
              const y = (i + 1) * 64;
              return <line key={'h' + y} x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.1)" />
            })}
            {/* Center lines */}
            <line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke="rgba(0,190,255,0.4)" />
            <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="rgba(0,190,255,0.4)" />
          </svg>
        )}
      </div>
    </div>
  );
}
