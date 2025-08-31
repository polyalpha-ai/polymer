import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'
import { getUserData } from '@/app/actions/user'

interface AuthUser extends User {
  subscription_tier?: 'free' | 'pay_per_use' | 'subscription'
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'inactive'
  analyses_remaining?: number
  polar_customer_id?: string
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: any }>
  signUp: (email: string, password: string) => Promise<{ data?: any; error?: any }>
  signInWithGoogle: () => Promise<{ data?: any; error?: any }>
  signOut: () => Promise<{ error?: any }>
  initialize: () => void
  refreshUser: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      initialized: false,

      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),

      signIn: async (email: string, password: string) => {
        set({ loading: true })
        const supabase = createClient()
        const result = await supabase.auth.signInWithPassword({ email, password })
        
        if (!result.error && result.data.user) {
          // Get user data from database using server action
          const userData = await getUserData(result.data.user.id)
          
          if (userData) {
            set({ 
              user: { 
                ...result.data.user, 
                subscription_tier: userData.subscription_tier,
                subscription_status: userData.subscription_status,
                analyses_remaining: userData.analyses_remaining,
                polar_customer_id: userData.polar_customer_id
              } as AuthUser 
            })
          } else {
            set({ user: result.data.user as AuthUser })
          }
        }
        
        set({ loading: false })
        return result
      },

      signUp: async (email: string, password: string) => {
        set({ loading: true })
        const supabase = createClient()
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        
        if (!error && data.user) {
          // Create user profile
          await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || email.split('@')[0],
              subscription_tier: 'free',
              subscription_status: 'inactive',
              analyses_remaining: 0,
              total_analyses_run: 0,
            })
          
          set({ 
            user: { 
              ...data.user,
              subscription_tier: 'free',
              subscription_status: 'inactive',
              analyses_remaining: 0
            } as AuthUser 
          })
        }
        
        set({ loading: false })
        return { data, error }
      },

      signInWithGoogle: async () => {
        const supabase = createClient()
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
      },

      signOut: async () => {
        const supabase = createClient()
        const result = await supabase.auth.signOut()
        set({ user: null })
        return result
      },

      refreshUser: async () => {
        const supabase = createClient()
        
        // Get fresh session first
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          console.log('[RefreshUser] No session')
          return
        }

        console.log('[RefreshUser] Fetching latest user data for:', session.user.id)
        
        // Use server action to fetch user data
        const userData = await getUserData(session.user.id)

        if (!userData) {
          console.error('[RefreshUser] No user data returned from server')
          return
        }

        console.log('[RefreshUser] Fresh data from DB:', userData)
        
        const updatedUser = { 
          ...session.user, 
          subscription_tier: userData.subscription_tier,
          subscription_status: userData.subscription_status,
          analyses_remaining: userData.analyses_remaining,
          polar_customer_id: userData.polar_customer_id
        } as AuthUser
        
        console.log('[RefreshUser] Setting user with subscription:', updatedUser.subscription_tier, updatedUser.subscription_status)
        
        set({ user: updatedUser })
      },

      initialize: () => {
        if (get().initialized) return
        
        // Mark as initialized
        set({ initialized: true })
        
        console.log('[Initialize] Starting auth initialization')
        console.log('[Initialize] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('[Initialize] Has anon key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        
        const supabase = createClient()
        
        // Test if client is working
        console.log('[Initialize] Supabase client created:', !!supabase)
        
        // Set loading false after a delay if auth state doesn't update
        const timeoutId = setTimeout(() => {
          const currentState = get()
          if (currentState.loading) {
            console.log('[Initialize] Auth initialization timeout - stopping loader')
            set({ loading: false })
          }
        }, 3000)

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('[Auth State Change]', event, session?.user?.email)
            
            // Clear timeout since we got an auth update
            if (timeoutId) clearTimeout(timeoutId)
            
            if (session?.user) {
              console.log('[Auth State Change] User detected, fetching data...')
              
              // Set basic user immediately
              set({ 
                user: session.user as AuthUser,
                loading: false 
              })
              
              // Then fetch subscription data using server action
              try {
                console.log('[Auth State Change] Fetching user data via server action for:', session.user.id)
                
                const userData = await getUserData(session.user.id)
                
                console.log('[Auth State Change] Server action returned:', userData)
                
                if (userData) {
                  console.log('[Auth State Change] Got user data:', userData)
                  console.log('[Auth State Change] Subscription from DB:', {
                    tier: userData.subscription_tier,
                    status: userData.subscription_status
                  })
                  
                  set({ 
                    user: {
                      ...session.user,
                      subscription_tier: userData.subscription_tier,
                      subscription_status: userData.subscription_status,
                      analyses_remaining: userData.analyses_remaining,
                      polar_customer_id: userData.polar_customer_id
                    } as AuthUser
                  })
                  
                  // Verify update
                  const updated = get().user
                  console.log('[Auth State Change] After set:', {
                    tier: updated?.subscription_tier,
                    status: updated?.subscription_status
                  })
                } else {
                  console.log('[Auth State Change] No user data found in DB')
                  // If no user exists, create one
                  console.log('[Auth State Change] User not in DB, creating...')
                  const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert({
                      id: session.user.id,
                      email: session.user.email,
                      full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                      avatar_url: session.user.user_metadata?.avatar_url,
                      subscription_tier: 'free',
                      subscription_status: 'inactive'
                    })
                    .select()
                    .single()
                  
                  if (createError) {
                    console.error('[Auth State Change] Error creating user:', createError)
                  } else {
                    console.log('[Auth State Change] Created user:', newUser)
                    // Fetch the created user data
                    const createdUserData = await getUserData(session.user.id)
                    if (createdUserData) {
                      set({ 
                        user: {
                          ...session.user,
                          subscription_tier: createdUserData.subscription_tier,
                          subscription_status: createdUserData.subscription_status,
                          analyses_remaining: createdUserData.analyses_remaining,
                          polar_customer_id: createdUserData.polar_customer_id
                        } as AuthUser
                      })
                    }
                  }
                }
              } catch (err) {
                console.error('[Auth State Change] Exception fetching user data:', err)
              }
              
              // Handle sign in event - create user profile if needed
              if (event === 'SIGNED_IN') {
                console.log('[Auth State Change] Handling SIGNED_IN event')
                try {
                  await supabase
                    .from('users')
                    .upsert({
                      id: session.user.id,
                      email: session.user.email,
                      full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                      avatar_url: session.user.user_metadata?.avatar_url,
                    }, {
                      onConflict: 'id'
                    })
                } catch (err) {
                  console.error('[Auth State Change] Error upserting user:', err)
                }
              }
            } else {
              console.log('[Auth State Change] No session, clearing user')
              set({ 
                user: null,
                loading: false 
              })
            }
          }
        )
        
        // Trigger initial check
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            console.log('[Initialize] Found existing session, triggering auth state change')
            // The onAuthStateChange handler will handle this
          } else {
            console.log('[Initialize] No existing session')
            set({ loading: false })
          }
        })

        // Cleanup subscription on unmount
        if (typeof window !== 'undefined') {
          window.addEventListener('beforeunload', () => {
            subscription.unsubscribe()
          })
        }
      },
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