// Utility functions for India Standard Time (Asia/Kolkata)
// All dates stored in MongoDB are UTC. These helpers convert between UTC and IST.

export const nowIST = () => {
  // Return current time as Date object in IST (offset +5:30)
  const now = new Date();
  const offsetMs = 5.5 * 60 * 60 * 1000; // 5.5 hours
  return new Date(now.getTime() + offsetMs);
};

export const toIST = (date) => {
  // Convert a UTC Date to IST Date
  const offsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(date.getTime() + offsetMs);
};

export const toUTCFromIST = (istDate) => {
  // Convert an IST Date (or date string interpreted as IST) to UTC Date for storage
  const offsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(istDate.getTime() - offsetMs);
};
