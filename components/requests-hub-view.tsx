'use client';

import { useMemo, useState } from 'react';

import { ItemsListView } from '@/components/items-list-view';
import type { OpsItemType } from '@/lib/types';

type RequestTab = {
  key: OpsItemType;
  label: string;
  description: string;
};

const REQUEST_TABS: RequestTab[] = [
  {
    key: 'feedback',
    label: 'Feedback',
    description: 'Productfeedback en algemene input van klanten of leads.',
  },
  {
    key: 'website_request',
    label: 'Website',
    description: 'Nieuwe website-aanvragen met contactgegevens en projectcontext.',
  },
  {
    key: 'price_import_request',
    label: 'Prijsimport',
    description: 'Intake voor prijslijsten, leveranciersdata en importondersteuning.',
  },
  {
    key: 'custom_klus_request',
    label: 'Custom klus',
    description: 'Maatwerkverzoeken die niet in de standaard flow vallen.',
  },
  {
    key: 'demo_request',
    label: 'Demo',
    description: 'Demo-aanvragen met timing en bereikbaarheid van de lead.',
  },
];

export function RequestsHubView() {
  const [activeTab, setActiveTab] = useState<OpsItemType>('feedback');
  const activeConfig = useMemo(
    () => REQUEST_TABS.find((tab) => tab.key === activeTab) ?? REQUEST_TABS[0],
    [activeTab],
  );

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="card">
        <div className="request-tabs" role="tablist" aria-label="Aanvraagtypes">
          {REQUEST_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={tab.key === activeTab}
              className={`request-tab ${tab.key === activeTab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ItemsListView
        fixedType={activeConfig.key}
        title={`${activeConfig.label} aanvragen`}
        description={activeConfig.description}
        showCard={false}
      />
    </div>
  );
}
