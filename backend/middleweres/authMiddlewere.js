const jwt = require('jsonwebtoken')
const logger = require('../utils/logger')

exports.authMiddleware = (req, res, next) => {
    const token = req.cookies.token
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized', code: 'NO_TOKEN' })
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (!decoded) {
            return res.status(401).json({ success: false, message: 'Invalid Token', code: 'INVALID_TOKEN' })
        }
        req.user = {
            id: decoded.id,
            role: typeof decoded.role === 'string' ? decoded.role.toLowerCase() : '',
            userType: typeof decoded.userType === 'string' ? decoded.userType.toLowerCase() : '',
            farmId: decoded.farmId,
            permissions: Array.isArray(decoded.permissions)
                ? decoded.permissions.map((perm) => (typeof perm === 'string' ? perm.toLowerCase() : perm))
                : [],
        }
        return next()
    } catch (error) {
        logger.error('Auth Middleware Error:', error)
        // console.error(error)
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' })
        }
        return res.status(401).json({ success: false, message: 'Invalid Token', code: 'INVALID_TOKEN' })
    }
}

exports.isManager = (req, res, next) => {
    if (!req.user || (req.user.role !== 'manager' && req.user.role !== 'admin')) {
        return res.status(403).json({ message: 'Forbidden: Manager access only' })
    }
    return next()
}

exports.isAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.userType !== 'admin')) {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin access only' })
    }
    return next()
}

exports.checkPermission = (page) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized Access' })
    }
    if (req.user.role === 'manager' || req.user.role === 'admin') {
        return next()
    }
    if (!page) {
        return next()
    }
    if (Array.isArray(req.user.permissions) && req.user.permissions.includes(page)) {
        return next()
    }
    return res.status(403).json({ message: 'Forbidden: Insufficient permissions' })
}
