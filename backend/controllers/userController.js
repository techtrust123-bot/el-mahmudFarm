const authModel = require('../models/auth.js')

exports.userData = async(req,res)=>{
    const userId = req.user.id
    try {
        const user = await authModel.findById(userId)
        if(!user){
            return res.status(400).json({message:'user not found...'})
        }
    
        let subscriptionData = {
      isSubscribed: user.isSubscribed,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStart: user.subscriptionStart,
      subscriptionEnd: user.subscriptionEnd,
    }

    if (user.userType === 'staff') {
      const manager = await authModel.findOne({ farmId: user.farmId, userType: 'manager' })
      if (manager) {
        subscriptionData = {
          isSubscribed: manager.isSubscribed,
          subscriptionStatus: manager.subscriptionStatus,
          subscriptionStart: manager.subscriptionStart,
          subscriptionEnd: manager.subscriptionEnd,
        }
      }
    }

    res.status(200).json({success:"true",userData:{
            id: user._id,
            name: user.name,
            email: user.email,
            isAccountVerified:user.isAccountVerified,
            role:user.role,
            userType:user.userType,
            farmId:user.farmId,
            permissions:user.permissions || [],
            balance:user.balance,
            farmName:user.farmName,
            phone:user.phone,
            country:user.country,
            city:user.city,
            address:user.address,
            contact:user.contact,
            salary:user.salary,
            hireDate:user.hireDate,
            ...subscriptionData,
        }})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.updateBalance = async(req,res)=>{
    const userId = req.user.id
    const {balance} = req.body
    try {
        const user = await authModel.findById(userId)
        if(!user){
            return res.status(400).json({message:'user not found...'})
        }
        user.balance = balance
        await user.save()
        res.status(200).json({success:"true",message:"balance updated successfully..."})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.addStaff = async(req,res)=>{
    if (!req.user || req.user.userType !== 'manager') {
        return res.status(403).json({ message: 'Forbidden: Manager access only' })
    }
    const { name, email, password, role, permissions, contact, salary, hireDate } = req.body
    if (!name || !email || !password || !role) {
        return res.status(400).json({ success:false, message: 'Name, email, password and role are required.' })
    }
    try {
        const existing = await authModel.findOne({ email })
        if (existing) {
            return res.status(400).json({ success:false, message: 'Staff user already exists with that email.' })
        }
        const hashPassword = await require('bcryptjs').hash(password, 10)
        const normalizedPermissions = Array.isArray(permissions)
            ? permissions.map((perm) => (typeof perm === 'string' ? perm.toLowerCase() : perm))
            : [];
        const staff = new authModel({
            name,
            email,
            password: hashPassword,
            role,
            userType: 'staff',
            farmId: req.user.farmId,
            permissions: normalizedPermissions,
            createdBy: req.user.id,
            contact: contact || '',
            salary: Number(salary) || 0,
            hireDate: hireDate ? new Date(hireDate) : null,
            farmName: '',
        })
        await staff.save()
        const { password: _, ...staffData } = staff.toObject()
        res.status(201).json({ success:true, message:'Staff created successfully.', data:staffData })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success:false, message:error.message })
    }
}

exports.getStaff = async(req,res)=>{
    if (!req.user || req.user.userType !== 'manager') {
        return res.status(403).json({ message: 'Forbidden: Manager access only' })
    }
    try {
        const staff = await authModel.find({ farmId: req.user.farmId, userType: 'staff' }).select('-password')
        res.status(200).json({ success:true, message:'Staff retrieved successfully.', data: staff })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success:false, message:error.message })
    }
}

exports.getStaffById = async(req,res)=>{
    if (!req.user || req.user.userType !== 'manager') {
        return res.status(403).json({ message: 'Forbidden: Manager access only' })
    }
    const id = req.params.id
    try {
        const staff = await authModel.findOne({ _id: id, farmId: req.user.farmId, userType: 'staff' }).select('-password')
        if (!staff) {
            return res.status(404).json({ success:false, message:'Staff member not found.' })
        }
        res.status(200).json({ success:true, message:'Staff found.', data: staff })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success:false, message:error.message })
    }
}

exports.updateStaff = async(req,res)=>{
    if (!req.user || req.user.userType !== 'manager') {
        return res.status(403).json({ message: 'Forbidden: Manager access only' })
    }
    const id = req.params.id
    const { name, role, permissions, contact, salary, hireDate } = req.body
    try {
        const staff = await authModel.findOne({ _id: id, farmId: req.user.farmId, userType: 'staff' })
        if (!staff) {
            return res.status(404).json({ success:false, message:'Staff member not found.' })
        }
        if (name) staff.name = name
        if (role) staff.role = role
        if (Array.isArray(permissions)) staff.permissions = permissions
        if (contact !== undefined) staff.contact = contact
        if (salary !== undefined) staff.salary = Number(salary) || 0
        if (hireDate) staff.hireDate = new Date(hireDate)
        await staff.save()
        const { password: _, ...staffData } = staff.toObject()
        res.status(200).json({ success:true, message:'Staff updated successfully.', data: staffData })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success:false, message:error.message })
    }
}

exports.deleteStaff = async(req,res)=>{
    if (!req.user || req.user.userType !== 'manager') {
        return res.status(403).json({ message: 'Forbidden: Manager access only' })
    }
    const id = req.params.id
    try {
        const staff = await authModel.findOne({ _id: id, farmId: req.user.farmId, userType: 'staff' })
        if (!staff) {
            return res.status(404).json({ success:false, message:'Staff member not found.' })
        }
        await authModel.findByIdAndDelete(id)
        res.status(200).json({ success:true, message:'Staff deleted successfully.' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success:false, message:error.message })
    }
}

exports.getAllUsers = async(req,res)=>{
    try {
        const users = await authModel.find()
        res.status(200).json({success:true,message:"users found...",data:users})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.getUserById = async(req,res)=>{
    const id = req.params.id
    try {
        const user = await authModel.findById(id)
        if(!user){
            return res.status(404).json({message:"user not found..."})
        }
        res.status(200).json({success:true,message:"user found...",data:user})
    }
        catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.updateUserRole = async(req,res)=>{
    const id = req.params.id
    const {role} = req.body
    try {
        const user = await authModel.findById(id)
        if(!user){
            return res.status(404).json({message:"user not found..."})
        }
        user.role = role
        await user.save()
        res.status(200).json({success:true,message:"user role updated successfully..."})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.suspendUser = async(req,res)=>{
    const id = req.params.id
    try {
        const user = await authModel.findById(id)
        if(!user){
            return res.status(404).json({message:"user not found..."})
        }
        user.isAccountVerified = false
        await user.save()
        res.status(200).json({success:true,message:"user suspended successfully..."})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }

}

exports.activateUser = async(req,res)=>{
    const id = req.params.id
    try {
        const user = await authModel.findById(id)
        if(!user){
            return res.status(404).json({message:"user not found..."})
        }
        user.isAccountVerified = true
        await user.save()
        res.status(200).json({success:true,message:"user activated successfully..."})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.deleteUser = async(req,res)=>{ 
    const id = req.params.id
    try {
        const user = await authModel.findById(id)
        if(!user){
            return res.status(404).json({message:"user not found..."})
        }
        await authModel.findByIdAndDelete(id)
        res.status(200).json({success:true,message:"user deleted successfully..."})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message})
    }
}