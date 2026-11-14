import type { PartSlot } from '../engine/types';

const paths: Record<PartSlot, React.ReactNode> = {
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      <path d="M9 2.5v3M12 2.5v3M15 2.5v3M9 18.5v3M12 18.5v3M15 18.5v3M2.5 9h3M2.5 12h3M2.5 15h3M18.5 9h3M18.5 12h3M18.5 15h3" />
    </>
  ),
  motherboard: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="6" y="6" width="6" height="6" rx="0.8" />
      <path d="M15 6v6M17.5 6v6M6 15.5h12M6 18h8" />
    </>
  ),
  ram: (
    <>
      <path d="M2.5 8h19v8h-19z" />
      <path d="M5.5 10.5h2.5v3H5.5zM10.75 10.5h2.5v3h-2.5zM16 10.5h2.5v3H16z" />
      <path d="M6 16v2.5M10 16v2.5M14 16v2.5M18 16v2.5" />
    </>
  ),
  gpu: (
    <>
      <rect x="2.5" y="6" width="19" height="11" rx="1.5" />
      <circle cx="9" cy="11.5" r="3" />
      <circle cx="16.5" cy="11.5" r="2" />
      <path d="M5 17v2.5h8V17" />
    </>
  ),
  storage: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      <path d="M6 10h6M6 13.5h4" />
      <circle cx="17" cy="12" r="1.2" />
    </>
  ),
  cooler: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 10.4C11 7 12.5 4.5 15 4.5M13.6 12.8c3.4.9 4.7 3.5 3.5 5.7M10.4 12.6c-2.5 2.5-5.4 2.4-6.6.2" />
    </>
  ),
  psu: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M13 7.5l-4 5h3.5l-1.5 4 4-5.5h-3.5z" />
    </>
  ),
  case: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="1.5" />
      <path d="M9 6h6M9 8.5h6" />
      <circle cx="12" cy="15" r="2.6" />
    </>
  ),
};

export function SlotIcon({ slot, size = 22 }: { slot: PartSlot; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[slot]}
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}
