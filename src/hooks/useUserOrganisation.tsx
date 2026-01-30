/**
 * Simplified hook for single-company internal use.
 * Returns static default since we no longer need organisation filtering.
 */
export function useUserOrganisation() {
  return {
    organisationId: 'single-company',
    isLoading: false,
    error: null,
  };
}
