"use client";

import { Form, Switch } from "antd";
import { useI18n } from "@/i18n";
import { DomainList } from "./domain-list";
import { SettingsSection } from "./settings-section";

const WHITELIST_FIELD = ["links", "domain_whitelist"];
const BLACKLIST_FIELD = ["links", "domain_blacklist"];

export function LinksSection() {
  const { dict } = useI18n();
  const t = dict.settings.links;
  const whitelist: string[] = Form.useWatch(WHITELIST_FIELD) ?? [];
  const blacklist: string[] = Form.useWatch(BLACKLIST_FIELD) ?? [];

  return (
    <SettingsSection title={t.title} description={t.description}>
      <Form.Item
        name={["links", "allow_links"]}
        label={t.allowLinks}
        extra={t.allowLinksHint}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <div className="grid gap-x-6 md:grid-cols-2">
        <Form.Item name={WHITELIST_FIELD} label={t.whitelist} extra={t.whitelistHint}>
          <DomainList otherList={blacklist} otherListLabel={t.blacklist} />
        </Form.Item>
        <Form.Item name={BLACKLIST_FIELD} label={t.blacklist} extra={t.blacklistHint}>
          <DomainList otherList={whitelist} otherListLabel={t.whitelist} />
        </Form.Item>
      </div>
    </SettingsSection>
  );
}
