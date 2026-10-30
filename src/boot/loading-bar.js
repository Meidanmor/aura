import { setLoadingBarDefaults } from 'src/composables/useLoadingBar.js'

// Runs right after Quasar installs the bar, before any outside script on the
// page can open a request (MainLayout's init only comes after hydration).
export default () => {
    setLoadingBarDefaults()
}
