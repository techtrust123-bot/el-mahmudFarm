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
        req.user = {id: decoded.id, role: decoded.role}
        next()
    } catch (error) {
        return res.status(401).json({ message: 'Invalid Token' })
        console.log(error)
    }
    
}