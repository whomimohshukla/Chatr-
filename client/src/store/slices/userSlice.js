import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  preferences: {
    language: 'en',
    notifications: true,
    autoSkip: false,
    profanityFilter: true,
  },
}

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
    },
    updatePreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload }
    },
    clearUser: (state) => {
      state.user = null
    },
  },
})

export const { setUser, updatePreferences, clearUser } = userSlice.actions
export default userSlice.reducer
