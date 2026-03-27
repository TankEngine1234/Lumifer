// Apple-style spring physics configurations
// All motion uses spring physics — never linear or ease-in-out

export const springDefault = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 20,
};

export const springGentle = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 14,
};

export const springBouncy = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 10,
};

// Tap scale for all interactive elements
export const tapScale = {
  whileTap: { scale: 0.96 },
  transition: springDefault,
};
