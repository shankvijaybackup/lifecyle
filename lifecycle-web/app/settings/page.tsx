"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Slider } from "../../components/ui/slider";
import { toast } from "sonner";

const TENANTS = [
  { id: "compasiq", name: "CompasIQ" },
  { id: "acme", name: "Acme Retail" },
  { id: "globex", name: "Globex Manufacturing" },
];

const SCHEDULES = [
  { id: "DAILY_09_00", label: "Daily at 09:00" },
  { id: "DAILY_18_00", label: "Daily at 18:00" },
  { id: "WEEKLY_MON_09", label: "Weekly Monday 09:00" },
  { id: "WEEKLY_MON_18", label: "Weekly Monday 18:00" },
];

type QuietHours = { from: string; to: string };

type DeliveryChannels = {
  emails: string;
  slack_webhook: string;
  generic_webhook: string;
};

type AlertState = {
  enabled: boolean;
  days_to_eol_threshold: number;
  days_to_eos_threshold: number;
  schedule: string;
  quiet_hours: QuietHours;
};

type SettingsState = {
  tenant_id: string;
  alerts: AlertState;
  delivery: DeliveryChannels;
};

const defaultState: SettingsState = {
  tenant_id: TENANTS[0].id,
  alerts: {
    enabled: true,
    days_to_eol_threshold: 45,
    days_to_eos_threshold: 30,
    schedule: "DAILY_09_00",
    quiet_hours: { from: "21:00", to: "06:00" },
  },
  delivery: {
    emails: "ciso@compasiq.io, netops@compasiq.io",
    slack_webhook: "https://hooks.slack.com/services/T000/B000/XXXX",
    generic_webhook: "https://alerts.compasiq.io/webhook",
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultState);

  const updateAlerts = (partial: Partial<AlertState>) => {
    setSettings((prev) => ({ ...prev, alerts: { ...prev.alerts, ...partial } }));
  };

  const updateDelivery = (partial: Partial<DeliveryChannels>) => {
    setSettings((prev) => ({ ...prev, delivery: { ...prev.delivery, ...partial } }));
  };

  const handleSave = () => {
    console.log("Saving settings", settings);
    toast.success("Settings saved (mock)");
  };

  const handleTest = () => {
    console.log("Sending test alert", settings);
    toast.info("Sent test alert payload");
  };

  return (
    <div className="container space-y-6 py-8">
      <header className="flex flex-col gap-2">
        <div className="text-sm text-muted-foreground">Tenant Settings</div>
        <h1 className="text-3xl font-semibold">Lifecycle Alerts &amp; Notifications</h1>
        <p className="max-w-2xl text-muted-foreground">
          Configure how proactive lifecycle notifications are delivered for each tenant. Adjust alert
          thresholds, schedules, and delivery channels to keep teams ahead of upcoming EoL/EoS events.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tenant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant">Select tenant</Label>
              <Select
                id="tenant"
                value={settings.tenant_id}
                onChange={(e) => setSettings((prev) => ({ ...prev, tenant_id: e.target.value }))}
              >
                {TENANTS.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Tenant selection will scope alert schedules and delivery destinations once wired to the backend.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Lifecycle alerts</Label>
                <Switch
                  checked={settings.alerts.enabled}
                  onChange={(checked) => updateAlerts({ enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Days before End of Life</Label>
                  <span className="text-xs text-muted-foreground">Notify ahead of hardware EoL.</span>
                </div>
                <Slider
                  min={0}
                  max={365}
                  value={settings.alerts.days_to_eol_threshold}
                  onValueChange={(value) => updateAlerts({ days_to_eol_threshold: value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Days before End of Support</Label>
                  <span className="text-xs text-muted-foreground">Warn when support coverage is nearing.</span>
                </div>
                <Slider
                  min={0}
                  max={365}
                  value={settings.alerts.days_to_eos_threshold}
                  onValueChange={(value) => updateAlerts({ days_to_eos_threshold: value })}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="schedule">Delivery schedule</Label>
                  <Select
                    id="schedule"
                    value={settings.alerts.schedule}
                    onChange={(e) => updateAlerts({ schedule: e.target.value })}
                  >
                    {SCHEDULES.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quiet hours</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={settings.alerts.quiet_hours.from}
                      onChange={(e) =>
                        updateAlerts({ quiet_hours: { ...settings.alerts.quiet_hours, from: e.target.value } })
                      }
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={settings.alerts.quiet_hours.to}
                      onChange={(e) =>
                        updateAlerts({ quiet_hours: { ...settings.alerts.quiet_hours, to: e.target.value } })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emails">Email recipients</Label>
                <Textarea
                  id="emails"
                  rows={3}
                  placeholder="alerts@example.com, ops@example.com"
                  value={settings.delivery.emails}
                  onChange={(e) => updateDelivery({ emails: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list. Backend can fan out via SES, SendGrid, or your mail provider.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slack">Slack webhook</Label>
                <Input
                  id="slack"
                  placeholder="https://hooks.slack.com/services/..."
                  value={settings.delivery.slack_webhook}
                  onChange={(e) => updateDelivery({ slack_webhook: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook">Generic webhook</Label>
                <Input
                  id="webhook"
                  placeholder="https://your-alert-endpoint"
                  value={settings.delivery.generic_webhook}
                  onChange={(e) => updateDelivery({ generic_webhook: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave}>Save settings</Button>
            <Button variant="outline" onClick={handleTest}>
              Send test alert
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
