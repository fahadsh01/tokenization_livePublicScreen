import axios from "axios";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: "http://localhost:5000/api/v1",
  withCredentials: true,
});

// Helper to check if refresh token exists in cookies
function hasRefreshToken() {
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith("refreshToken="));
}

// Interceptor to handle 401
axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // Skip retry for logout or refresh endpoints
    const isLogoutOrRefresh =
      originalRequest.url?.includes("/users/logout") ||
      originalRequest.url?.includes("/refreshAccessToken");

    if (
      err.response?.status === 401 &&
      !originalRequest._retry &&
      !isLogoutOrRefresh
    ) {
      originalRequest._retry = true;

      // Only try refresh if refresh token exists
      if (hasRefreshToken()) {
        try {
          await axios.post(
            "http://localhost:5000/api/v1/users/refreshAccessToken",
            {},
            { withCredentials: true }
          );

          // Retry original request after refresh
          return axiosInstance(originalRequest);
        } catch (refreshErr) {
          console.warn("Refresh token failed, logging out user");
          // Redirect to login if refresh fails
          window.location.href = "/auth";
          return Promise.reject(refreshErr);
        }
      } else {
        // No refresh token → directly redirect
        window.location.href = "/auth";
        return Promise.reject(err);
      }
    }

    // All other errors
    return Promise.reject(err);
  }
);

export default axiosInstance;
