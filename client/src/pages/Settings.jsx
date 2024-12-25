import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { updatePreferences } from '../store/slices/userSlice'

export default function Settings() {
  const dispatch = useDispatch()
  const { preferences } = useSelector((state) => state.user)

  const handleToggle = (key) => {
    dispatch(updatePreferences({ [key]: !preferences[key] }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h2 className="text-2xl font-bold mb-6">Settings</h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Notifications</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Receive notifications when you get a new match
              </p>
            </div>
            <button
              onClick={() => handleToggle('notifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                preferences.notifications ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`${
                  preferences.notifications ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Auto-Skip</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Automatically skip inactive chats after 1 minute
              </p>
            </div>
            <button
              onClick={() => handleToggle('autoSkip')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                preferences.autoSkip ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`${
                  preferences.autoSkip ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Profanity Filter</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Filter out inappropriate language in chats
              </p>
            </div>
            <button
              onClick={() => handleToggle('profanityFilter')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                preferences.profanityFilter ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`${
                  preferences.profanityFilter ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Language</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Select your preferred language
              </p>
            </div>
            <select
              value={preferences.language}
              onChange={(e) =>
                dispatch(updatePreferences({ language: e.target.value }))
              }
              className="input max-w-[120px]"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
