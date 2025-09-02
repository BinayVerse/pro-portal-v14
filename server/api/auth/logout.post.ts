import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { CustomError } from '../../utils/custom.error'
import { SessionManager } from '../../utils/session-manager'
import jwt from 'jsonwebtoken'

const config = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  try {
    const authHeader = event.node.req.headers['authorization']
    const body = await readBody(event).catch(() => ({}))
    const { all_sessions = false } = body // Option to logout from all sessions
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      setResponseStatus(event, 200) // Don't fail logout even without token
      return {
        status: 'success',
        message: 'Logged out successfully'
      }
    }

    const token = authHeader.split(' ')[1]
    
    if (!token) {
      setResponseStatus(event, 200)
      return {
        status: 'success',
        message: 'Logged out successfully'
      }
    }

    try {
      // Decode JWT to get session info
      const decoded = jwt.verify(token, config.jwtToken as string) as any
      
      if (all_sessions) {
        // Invalidate all sessions for the user (ensure string type)
        await SessionManager.invalidateUserSessions(String(decoded.user_id))
      } else if (decoded.session_id) {
        // Invalidate only current session
        await SessionManager.invalidateSession(decoded.session_id)
      }
      
      console.log(`User ${decoded.user_id} logged out ${all_sessions ? '(all sessions)' : '(current session)'}`)
      
    } catch (jwtError) {
      // Token invalid but still allow logout
      console.warn('Invalid token during logout:', jwtError)
    }

    setResponseStatus(event, 200)
    return {
      status: 'success',
      message: 'Logged out successfully'
    }

  } catch (error: any) {
    console.error('Logout error:', error)
    
    // Always succeed logout to prevent stuck states
    setResponseStatus(event, 200)
    return {
      status: 'success',
      message: 'Logged out successfully'
    }
  }
})
