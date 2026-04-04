const jwt = require('jsonwebtoken')

exports.authMiddleware = (req, res, next) => {
    const token = req.cookies.token
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized Access' })
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (!decoded) {
            return res.status(401).json({ message: 'Unauthorized Access' })
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
        console.error(error)
        return res.status(401).json({ message: 'Invalid Token' })
    }
}

exports.isManager = (req, res, next) => {
    if (!req.user || (req.user.role !== 'manager' && req.user.role !== 'admin')) {
        return res.status(403).json({ message: 'Forbidden: Manager access only' })
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
