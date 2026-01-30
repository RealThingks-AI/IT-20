import React, { createContext, useContext, ReactNode } from 'react';

/**
 * Simplified OrganisationContext for single-company internal IT Hub
 * 
 * No async loading - returns static defaults for instant page load.
 * This eliminates the organisation fetch that was adding latency.
 */

interface Organisation {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  active_tools: string[];
  plan: string;
}

interface OrganisationContextType {
  organisation: Organisation;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Static defaults for single-company internal use
const DEFAULT_ORGANISATION: Organisation = {
  id: 'single-company',
  name: 'RT-IT-Hub',
  active_tools: ['helpdesk', 'assets', 'subscriptions', 'updates', 'monitoring', 'reports', 'audit'],
  plan: 'enterprise',
};

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export const OrganisationProvider = ({ children }: { children: ReactNode }) => {
  // No async loading - instant render with static config
  return (
    <OrganisationContext.Provider value={{ 
      organisation: DEFAULT_ORGANISATION, 
      loading: false,
      error: null, 
      refetch: async () => {} // No-op since we use static config
    }}>
      {children}
    </OrganisationContext.Provider>
  );
};

export const useOrganisation = () => {
  const context = useContext(OrganisationContext);
  if (context === undefined) {
    throw new Error('useOrganisation must be used within an OrganisationProvider');
  }
  return context;
};
