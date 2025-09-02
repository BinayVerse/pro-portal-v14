import crypto from 'crypto'
import { query } from './db'

interface SessionData {
  session_id: string
  user_id: string  // Changed from number to string to match database
  device_info?: string
  ip_address?: string
  expires_at: Date
}

interface CreateSessionOptions {
  user_id: string  // Changed from number to string to match database
  device_info?: string
  ip_address?: string
  expires_in_hours?: number
}

export class SessionManager {
  private static readonly DEFAULT_EXPIRY_HOURS = 24
  private static readonly MAX_SESSIONS_PER_USER = 5

  /**
   * Create a new session for a user
   */
  static async createSession(options: CreateSessionOptions): Promise<string> {
    const { user_id, device_info, ip_address, expires_in_hours = this.DEFAULT_EXPIRY_HOURS } = options
    
    // Generate secure session ID
    const session_id = crypto.randomBytes(32).toString('hex')
    
    // Calculate expiration time
    const expires_at = new Date()
    expires_at.setHours(expires_at.getHours() + expires_in_hours)
    
    try {
      // Clean up expired sessions for this user first
      await this.cleanupExpiredSessions(user_id)
      
      // Check if user has too many active sessions
      await this.enforceSessionLimit(user_id)
      
      // Insert new session
      await query(
        `INSERT INTO user_sessions (session_id, user_id, device_info, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [session_id, user_id, device_info, ip_address, expires_at]
      )
      
      // Update user's last login and session count
      await query(
        `UPDATE users 
         SET last_login = CURRENT_TIMESTAMP,
             active_sessions_count = (
               SELECT COUNT(*) FROM user_sessions 
               WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
             )
         WHERE user_id = $1`,
        [user_id]
      )
      
      return session_id
    } catch (error) {
      console.error('Failed to create session:', error)
      throw new Error('Session creation failed')
    }
  }

  /**
   * Validate a session and update last_active timestamp
   */
  static async validateSession(session_id: string): Promise<SessionData | null> {
    try {
      const result = await query(
        `SELECT session_id, user_id, device_info, ip_address, expires_at
         FROM user_sessions 
         WHERE session_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP`,
        [session_id]
      )
      
      if (!result.rows.length) {
        return null
      }
      
      const session = result.rows[0]
      
      // Update last_active timestamp
      await query(
        `UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE session_id = $1`,
        [session_id]
      )
      
      return session
    } catch (error) {
      console.error('Session validation failed:', error)
      return null
    }
  }

  /**
   * Invalidate a specific session
   */
  static async invalidateSession(session_id: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE user_sessions SET is_active = FALSE WHERE session_id = $1`,
        [session_id]
      )
      
      return result.rowCount > 0
    } catch (error) {
      console.error('Session invalidation failed:', error)
      return false
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  static async invalidateUserSessions(user_id: string): Promise<boolean> {
    try {
      await query(
        `UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1`,
        [user_id]
      )
      
      await query(
        `UPDATE users SET active_sessions_count = 0 WHERE user_id = $1`,
        [user_id]
      )
      
      return true
    } catch (error) {
      console.error('User session invalidation failed:', error)
      return false
    }
  }

  /**
   * Clean up expired sessions for a user
   */
  static async cleanupExpiredSessions(user_id?: string): Promise<void> {
    try {
      if (user_id) {
        await query(
          `DELETE FROM user_sessions 
           WHERE user_id = $1 AND (expires_at <= CURRENT_TIMESTAMP OR is_active = FALSE)`,
          [user_id]
        )
      } else {
        // Clean up all expired sessions
        await query(
          `DELETE FROM user_sessions 
           WHERE expires_at <= CURRENT_TIMESTAMP OR is_active = FALSE`
        )
      }
    } catch (error) {
      console.error('Session cleanup failed:', error)
    }
  }

  /**
   * Enforce session limit per user (remove oldest sessions if limit exceeded)
   */
  static async enforceSessionLimit(user_id: string): Promise<void> {
    try {
      const activeSessions = await query(
        `SELECT session_id FROM user_sessions 
         WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
         ORDER BY last_active ASC`,
        [user_id]
      )
      
      if (activeSessions.rows.length >= this.MAX_SESSIONS_PER_USER) {
        // Remove oldest sessions to make room
        const sessionsToRemove = activeSessions.rows.slice(0, activeSessions.rows.length - this.MAX_SESSIONS_PER_USER + 1)
        
        for (const session of sessionsToRemove) {
          await this.invalidateSession(session.session_id)
        }
      }
    } catch (error) {
      console.error('Session limit enforcement failed:', error)
    }
  }

  /**
   * Get active sessions for a user
   */
  static async getUserSessions(user_id: string): Promise<SessionData[]> {
    try {
      const result = await query(
        `SELECT session_id, user_id, device_info, ip_address, expires_at, last_active
         FROM user_sessions 
         WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
         ORDER BY last_active DESC`,
        [user_id]
      )
      
      return result.rows
    } catch (error) {
      console.error('Failed to get user sessions:', error)
      return []
    }
  }

  /**
   * Extract device info from user agent
   */
  static extractDeviceInfo(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device'
    
    // Simple device detection
    if (userAgent.includes('Mobile')) {
      if (userAgent.includes('iPhone')) return 'iPhone'
      if (userAgent.includes('Android')) return 'Android Mobile'
      return 'Mobile Device'
    }
    
    if (userAgent.includes('iPad')) return 'iPad'
    if (userAgent.includes('Macintosh')) return 'Mac'
    if (userAgent.includes('Windows')) return 'Windows PC'
    if (userAgent.includes('Linux')) return 'Linux PC'
    
    return 'Desktop Browser'
  }

  /**
   * Extract IP address from request
   */
  static extractIpAddress(event: any): string | undefined {
    const forwarded = event.node.req.headers['x-forwarded-for']
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]
    }
    
    return event.node.req.connection?.remoteAddress || 
           event.node.req.socket?.remoteAddress ||
           event.node.req.headers['x-real-ip']
  }
}
