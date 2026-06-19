"use client";

export type PlatformTab = "instagram" | "okky";

type PlatformSidebarProps = {
  activeTab: PlatformTab;
  onChange: (tab: PlatformTab) => void;
};

const tabs: {
  id: PlatformTab;
  label: string;
  description: string;
}[] = [
  {
    id: "instagram",
    label: "Instagram",
    description: "Post and account metrics",
  },
  {
    id: "okky",
    label: "OKKY",
    description: "Article metrics",
  },
];

export function PlatformSidebar({ activeTab, onChange }: PlatformSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebarHeader">
        <h2>Social Metrics</h2>
        <p>Instagram and OKKY only</p>
      </div>

      <nav className="sidebarNav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={activeTab === tab.id ? "sidebarTab active" : "sidebarTab"}
          >
            <span>{tab.label}</span>
            <small>{tab.description}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
}
