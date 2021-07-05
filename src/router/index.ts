import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'

import { PageNames } from '@/consts'
import store from '@/store'

Vue.use(VueRouter)

export const lazyComponent = (name: string) => () => import(`@/components/${name}.vue`)
export const lazyView = (name: string) => () => import(`@/views/${name}.vue`)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    redirect: '/exchange'
  },
  {
    path: '/exchange',
    name: PageNames.Exchange,
    component: lazyView(PageNames.Exchange)
  },
  {
    path: '/send',
    name: PageNames.Send,
    component: lazyView(PageNames.Exchange)
  },
  {
    path: '/pool',
    name: PageNames.Pool,
    component: lazyView(PageNames.Pool)
  },
  {
    path: '/wallet',
    name: PageNames.Wallet,
    component: lazyView(PageNames.Wallet)
  },
  {
    path: '/pool/create-pair',
    name: PageNames.CreatePair,
    component: lazyView(PageNames.CreatePair),
    meta: { requiresAuth: true }
  },
  {
    path: '/pool/add/:firstAddress/:secondAddress',
    name: PageNames.AddLiquidityId,
    component: lazyView(PageNames.AddLiquidity),
    meta: { requiresAuth: true }
  },
  {
    path: '/pool/add',
    name: PageNames.AddLiquidity,
    component: lazyView(PageNames.AddLiquidity),
    meta: { requiresAuth: true }
  },
  {
    path: '/pool/remove/:firstAddress/:secondAddress',
    name: PageNames.RemoveLiquidity,
    component: lazyView(PageNames.RemoveLiquidity),
    meta: { requiresAuth: true }
  },
  {
    path: '/kyc',
    name: PageNames.KYC,
    component: lazyView(PageNames.KYC)
  },
  {
    path: '*',
    redirect: '/exchange'
  }
]

const router = new VueRouter({
  mode: 'hash',
  routes
})

router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth) && !store.getters.isLoggedIn) {
    next({ name: PageNames.Wallet })
    return
  }
  if ([PageNames.Send, PageNames.Exchange].includes(to.name as PageNames)) {
    store.dispatch('swap/setIsSendOnly', to.name === PageNames.Send)
  }
  next()
})

export default router
