import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      // LocalStorage me save karein taaki refresh par data na ude
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        localStorage.setItem('token', action.payload.token);
      }
    },
    // ✅ YE WALA CODE ADD/CHECK KARO
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      // LocalStorage saaf karein
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;