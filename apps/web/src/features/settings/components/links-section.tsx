"use client";

import type { RuleSettings } from "@acms/shared";
import { Form, Switch } from "antd";
import { useI18n } from "@/i18n";
import { DomainList } from "./domain-list";
import { SettingsSectionForm } from "./settings-section-form";

const WHITELIST_FIELD = ["links", "domain_whitelist"];
const BLACKLIST_FIELD = ["links", "domain_blacklist"];

export function LinksSection({ settings }: { settings: RuleSettings }) {
  const { dict } = useI18n();
  const t = dict.settings.links;

  return (
    <SettingsSectionForm section="links" settings={settings} title={t.title} description={t.description}>
      <LinksFields />
    </SettingsSectionForm>
  );
}

function LinksFields() {
  const { dict } = useI18n();
  const t = dict.settings.links;
  const whitelist: string[] = Form.useWatch(WHITELIST_FIELD) ?? [];
  const blacklist: string[] = Form.useWatch(BLACKLIST_FIELD) ?? [];

  return (
    <>
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
    </>
  );
}
