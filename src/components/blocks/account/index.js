import { defineAsyncComponent } from 'vue'

// Signing in (Sign In / Sign Up forms, any page) and the My account page's own blocks
// (Store builder → Shop pages → My account): loaded only on the pages that use them.
const accountBlock = (name) => defineAsyncComponent(() => import(`./${name}.vue`))
const ACCOUNT_BLOCKS = {
  login_form: 'LoginFormBlock', signup_form: 'SignupFormBlock',
  account_title: 'AccountTitleBlock', account_menu: 'AccountMenuBlock', account_welcome: 'AccountWelcomeBlock',
  account_orders: 'AccountOrdersBlock', account_details: 'AccountDetailsBlock', account_logout: 'AccountLogoutBlock',
}
export const accountBlocks = {}
for (const [type, name] of Object.entries(ACCOUNT_BLOCKS)) accountBlocks[type] = accountBlock(name)
