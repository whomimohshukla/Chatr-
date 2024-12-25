import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
}

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.darkMode = !state.darkMode
      if (state.darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
  },
})

export const { toggleTheme } = themeSlice.actions
export default themeSlice.reducer
