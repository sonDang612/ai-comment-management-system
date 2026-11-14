"use client";

import type { RuleSettings } from "@acms/shared";
import { Form, Switch } from "antd";
import { useI18n } from "@/i18n";
import { DomainList } from "./domain-list";
import { SettingsSectionForm } from "./settings-section-form";

export function LinksSection({ settings }: { settings: RuleSettings }) {
  const { dict } = useI18n();
  const t = dict.settings.links;

  return (
    <SettingsSectionForm section="links" settings={settings} title={t.title} description={t.description}>
      <Form.Item
        name={["links", "allow_ip_addresses"]}
        label={t.allowIpAddresses}
        extra={t.allowIpAddressesHint}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name={["links", "domain_whitelist"]}
        label={t.whitelist}
        extra={t.whitelistHint}
        className="md:max-w-xl"
      >
        <DomainList />
      </Form.Item>
    </SettingsSectionForm>
  );
}
