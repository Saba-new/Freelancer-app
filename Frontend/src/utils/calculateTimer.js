export const calculateTimer = (endDate) => {
  return Math.max(0, endDate - Date.now());
};
