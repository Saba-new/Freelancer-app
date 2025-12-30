export const useAuth = () => {
  const token = localStorage.getItem("token");
  return { isLoggedIn: !!token };
};
