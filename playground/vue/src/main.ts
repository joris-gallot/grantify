import vueGrantify from '@grantify/vue'
import { createApp } from 'vue'
import App from './App.vue'

import { grantify } from './grantify'
import router from './router'

const app = createApp(App)
app.use(router)

app.use(vueGrantify(grantify))

app.mount('#app')
