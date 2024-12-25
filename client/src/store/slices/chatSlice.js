import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  currentRoom: null,
  messages: [],
  partner: null,
  isConnecting: false,
  isConnected: false,
  chatType: null, // 'text' or 'video'
  interests: [],
}

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setRoom: (state, action) => {
      state.currentRoom = action.payload
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload)
    },
    setPartner: (state, action) => {
      state.partner = action.payload
    },
    setConnecting: (state, action) => {
      state.isConnecting = action.payload
    },
    setConnected: (state, action) => {
      state.isConnected = action.payload
    },
    setChatType: (state, action) => {
      state.chatType = action.payload
    },
    setInterests: (state, action) => {
      state.interests = action.payload
    },
    clearChat: (state) => {
      state.currentRoom = null
      state.messages = []
      state.partner = null
      state.isConnected = false
      state.isConnecting = false
    },
  },
})

export const {
  setRoom,
  addMessage,
  setPartner,
  setConnecting,
  setConnected,
  setChatType,
  setInterests,
  clearChat,
} = chatSlice.actions

export default chatSlice.reducer
