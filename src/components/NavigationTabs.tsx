import React from 'react';
import { ActiveAppTab } from '../types';

interface NavigationTabsProps {
  activeTab: ActiveAppTab;
  onTabChange: (tab: ActiveAppTab) => void;
  counts: {
    events: number;
    opportunities: number;
    designers: number;
    artworks: number;
  };
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
}) => {
  const tabs: { id: ActiveAppTab; label: string; icon: string; count: number }[] = [
    { id: 'events', label: 'Exhibitions & Events', icon: '🏛️', count: counts.events },
    { id: 'opportunities', label: 'Open Calls & Residencies', icon: '🎯', count: counts.opportunities },
    { id: 'designers', label: 'Interior Designers & Specifiers', icon: '📐', count: counts.designers },
    { id: 'artworks', label: 'Artwork Sourcing & Projects', icon: '🖼️', count: counts.artworks },
  ];

  return (
    <nav className="nav-tabs-container" aria-label="Main Sections Navigation">
      <div className="nav-tabs-list" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`nav-tab-button ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count-pill" aria-label={`${tab.count} items`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
