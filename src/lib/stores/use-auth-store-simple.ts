import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  subscriptionData: {
    subscription_tier?: string
    subscription_status?: string
    analyses_remaining?: number
    polar_customer_id?: string
  } | null
}

interface AuthActions {
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  setSubscriptionData: (data: AuthState['subscriptionData']) => void
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: any }>
  signUp: (email: string, password: string) => Promise<{ data?: any; error?: any }>
  signInWithGoogle: () => Promise<{ data?: any; error?: any }>
  signOut: () => Promise<{ error?: any }>
  initialize: () => void
  fetchSubscriptionData: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

export const useAuthStoreSimple = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      initialized: false,
      subscriptionData: null,

      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),
      setSubscriptionData: (data) => set({ subscriptionData: data }),

      signIn: async (email: string, password: string) => {
        const supabase = createClient()
        
        try {
          const result = await supabase.auth.signInWithPassword({ email, password })
          
          if (result.error) {
            return { error: result.error }
          }
          
          // Let onAuthStateChange handle setting the user
          return { data: result.data }
        } catch (error) {
          return { error }
        }
      },

      signUp: async (email: string, password: string) => {
        const supabase = createClient()
        
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          })

          if (error) {
            return { error }
          }

          return { data }
        } catch (error) {
          return { error }
        }
      },

      signInWithGoogle: async () => {
        const supabase = createClient()
        
        try {
          const result = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              }
            }
          })
          
          return result
        } catch (error) {
          return { error }
        }
      },

      signOut: async () => {
        const supabase = createClient()
        const result = await supabase.auth.signOut()
        set({ user: null, subscriptionData: null })
        return result
      },

      fetchSubscriptionData: async () => {
        const user = get().user
        if (!user) return

        try {
          // Use server-side API to fetch user data
          const response = await fetch('/api/user/subscription', {
            headers: {
              'Content-Type': 'application/json',
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log('[Auth Store] Fetched subscription data:', data)
            set({ subscriptionData: data })
          }
        } catch (error) {
          console.error('[Auth Store] Error fetching subscription data:', error)
        }
      },

      initialize: () => {
        if (get().initialized) return
        
        set({ initialized: true })
        
        const supabase = createClient()
        
        // Timeout for loading state
        const timeoutId = setTimeout(() => {
          console.log('Auth initialization timeout - stopping loader')
          set({ loading: false })
        }, 3000)
        
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
          clearTimeout(timeoutId)
          console.log('Initial session check:', session?.user?.email || 'No user')
          set({ 
            user: session?.user ?? null,
            loading: false
          })
          
          // Fetch subscription data if user exists
          if (session?.user) {
            get().fetchSubscriptionData()
          }
        }).catch((error) => {
          clearTimeout(timeoutId)
          console.error('Failed to get initial session:', error)
          set({ 
            user: null,
            loading: false
          })
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email)
            
            set({ 
              user: session?.user ?? null,
              loading: false 
            })
            
            // Fetch subscription data on sign in
            if (event === 'SIGNED_IN' && session?.user) {
              get().fetchSubscriptionData()
            }
            
            // Clear subscription data on sign out
            if (event === 'SIGNED_OUT') {
              set({ subscriptionData: null })
            }
          }
        )

        // Cleanup
        if (typeof window !== 'undefined') {
          window.addEventListener('beforeunload', () => {
            subscription?.unsubscribe()
          })
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        user: state.user
      }),
      skipHydration: true,
    }
  )
)