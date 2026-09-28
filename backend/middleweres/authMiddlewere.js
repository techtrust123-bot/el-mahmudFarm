const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const authModel = require('../models/auth')
const logger = require('../utils/logger')

exports.authMiddleware = async (req, res, next) => {
    const token = req.cookies.token
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized', code: 'NO_TOKEN' })
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (!decoded) {
            return res.status(401).json({ success: false, message: 'Invalid Token', code: 'INVALID_TOKEN' })
        }
        if (!decoded.id || !mongoose.isObjectIdOrHexString(decoded.id)) {
            return res.status(401).json({ success: false, message: 'Invalid Token', code: 'INVALID_TOKEN' })
        }

        let account
        try {
            account = await authModel.findById(decoded.id).select('role userType farmId permissions deletedAt name email isSubscribed subscriptionEnd subscriptionStatus subscriptionType subscriptionPlan billingCycle')
        } catch (accountLookupError) {
            logger.error('Auth account lookup failed:', accountLookupError)
            return res.status(500).json({ success: false, message: 'Unable to verify account status' })
        }

        if (!account || account.deletedAt) {
            return res.status(401).json({ success: false, message: 'Account is no longer available', code: 'INVALID_TOKEN' })
        }

        req.user = {
            id: String(account._id),
            role: typeof account.role === 'string' ? account.role.toLowerCase() : '',
            userType: typeof account.userType === 'string' ? account.userType.toLowerCase() : '',
            farmId: account.farmId,
            name: account.name,
            email: account.email,
            isSubscribed: account.isSubscribed,
            subscriptionEnd: account.subscriptionEnd,
            subscriptionStatus: account.subscriptionStatus,
            subscriptionType: account.subscriptionType,
            subscriptionPlan: account.subscriptionPlan,
            billingCycle: account.billingCycle,
            permissions: Array.isArray(account.permissions)
                ? account.permissions.map((perm) => (typeof perm === 'string' ? perm.toLowerCase() : perm))
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
