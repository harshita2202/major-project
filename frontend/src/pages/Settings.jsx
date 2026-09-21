import { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Lock, CheckCircle2, Save } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getSettings, updateSettings } from '../services/api';

export default function SystemSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleProctoringToggle = (key) => {
    setSettings({
      ...settings,
      proctoring: {
        ...settings.proctoring,
        [key]: !settings.proctoring[key]
      }
    });
  };

  const handleNotificationToggle = (key) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key]
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Retrieving system configuration..." size={36} />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--pt-navy-900)', margin: 0, letterSpacing: '-0.02em' }}>
            ProctorTrack™ Platform Configuration
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>
            Configure ProctorAuto™ ML thresholds, identity verification policies, and institutional notification webhooks
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveSuccess && (
            <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} /> Preferences Saved
            </span>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Proctoring Settings (Key Requirement) */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Shield size={18} color="var(--pt-navy-800)" />
                ProctorAuto™ Detection Modules
              </h3>
              <div className="card-subtitle">Enable or disable facial, acoustic, and behavioral ML detectors</div>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="switch-container">
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                  Enable Face Detection
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Continuous verification that candidate remains in webcam frame
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.proctoring.enableFaceDetection}
                  onChange={() => handleProctoringToggle('enableFaceDetection')}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="switch-container">
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                  Enable Multiple Face Detection
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Flag session immediately if a secondary or third person appears
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.proctoring.enableMultipleFaceDetection}
                  onChange={() => handleProctoringToggle('enableMultipleFaceDetection')}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="switch-container">
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                  Enable Tab Switching Detection
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Monitor browser visibility API and log unfocused window events
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.proctoring.enableTabSwitchingDetection}
                  onChange={() => handleProctoringToggle('enableTabSwitchingDetection')}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="switch-container">
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                  Enable Audio Monitoring
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Detect conversational frequency, whispered speech, and background noise
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.proctoring.enableAudioMonitoring}
                  onChange={() => handleProctoringToggle('enableAudioMonitoring')}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="switch-container">
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                  Enable Suspicious Movement Detection
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Analyze head yaw, pitch, and repetitive downward gaze vectors
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.proctoring.enableSuspiciousMovementDetection}
                  onChange={() => handleProctoringToggle('enableSuspiciousMovementDetection')}
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Settings size={18} color="#2563eb" />
                General Academic Configuration
              </h3>
              <div className="card-subtitle">Institution parameters and data retention policies</div>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Platform Branding Name</label>
              <input
                type="text"
                className="form-input"
                value={settings.general.platformName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, platformName: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Institution / University</label>
              <input
                type="text"
                className="form-input"
                value={settings.general.institution}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, institution: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Admin Security Contact Email</label>
              <input
                type="email"
                className="form-input"
                value={settings.general.adminEmail}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, adminEmail: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Audit Log Retention (Days)</label>
              <input
                type="number"
                className="form-input"
                value={settings.general.retentionDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, retentionDays: Number(e.target.value) }
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Bell size={18} color="#2563eb" />
                Alerts & Notifications
              </h3>
              <div className="card-subtitle">Dispatch triggers for proctors and academic administrators</div>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="switch-container">
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                  Email Alerts on High Risk
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Immediately email lead proctor when threat level exceeds 75%
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.notifications.emailAlertsOnHighRisk}
                  onChange={() => handleNotificationToggle('emailAlertsOnHighRisk')}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="switch-container">
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                  In-App Audio Chime Alerts
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Play an audible cue when a candidate triggers high-severity anomaly
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.notifications.inAppSoundAlerts}
                  onChange={() => handleNotificationToggle('inAppSoundAlerts')}
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Lock size={18} color="#2563eb" />
                Session & Model Security
              </h3>
              <div className="card-subtitle">AI inference models and access control parameters</div>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Active Vision Model Version</label>
              <input
                type="text"
                disabled
                className="form-input"
                style={{ backgroundColor: '#f1f5f9', color: '#475569' }}
                value={settings.security.aiModelVersion}
              />
            </div>

            <div className="switch-container">
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                  Two-Factor Authentication for Proctors
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Require TOTP token for admin actions
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.security.twoFactorAuth}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, twoFactorAuth: !settings.security.twoFactorAuth }
                    })
                  }
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
