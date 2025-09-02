import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { CustomError } from '../../utils/custom.error'
import { SessionManager } from '../../utils/session-manager'
import jwt from 'jsonwebtoken'

const config = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  try {
    const authHeader = event.node.req.headers['authorization']
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        reason: 'No valid authorization header'
      }
    }

    const token = authHeader.split(' ')[1]
    
    if (!token) {
      return {
        valid: false,
        reason: 'No token provided'
      }
    }

    // Verify JWT token
    let decoded: any
    try {
      decoded = jwt.verify(token, config.jwtToken as string)
    } catch (jwtError) {
      return {
        valid: false,
        reason: 'Invalid JWT token'
      }
    }

    // Check if session ID exists in token (backward compatibility)
    if (!decoded.session_id) {
      // Old token without session ID - assume valid but log warning
      console.warn('Token without session ID detected for user:', decoded.user_id)
      return {
        valid: true,
        reason: 'Legacy token format',
        legacy: true
      }
    }

    // Validate session in database
    const session = await SessionManager.validateSession(decoded.session_id)
    
    if (!session) {
      return {
        valid: false,
        reason: 'Session expired or not found'
      }
    }

    // Verify session belongs to token user (ensure string comparison)
    if (String(session.user_id) !== String(decoded.user_id)) {
      return {
        valid: false,
        reason: 'Session user mismatch'
      }
    }

    return {
      valid: true,
      reason: 'Session valid',
      session_id: decoded.session_id,
      user_id: decoded.user_id,
      expires_at: session.expires_at
    }

  } catch (error: any) {
    console.error('Session validation error:', error)
    
    setResponseStatus(event, 200) // Don't return 500, just indicate invalid
    
    return {
      valid: false,
      reason: 'Validation error occurred'
    }
  }
})
