import { configureStore } from '@reduxjs/toolkit'
import userReducer from './slices/userSlice'
import chatReducer from './slices/chatSlice'
import themeReducer from './slices/themeSlice'

export const store = configureStore({
  reducer: {
    user: userReducer,
    chat: chatReducer,
    theme: themeReducer,
  },
})
