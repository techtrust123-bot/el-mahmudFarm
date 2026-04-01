const authModel = require('../models/auth.js')

exports.userData = async(req,res)=>{
    const userId = req.user.id
    try {
        const user = await authModel.findById(userId)
        if(!user){
            return res.status(400).json({message:'user not found...'})
        }
    
        res.status(200).json({success:"true",userData:{
            name: user.name,
            email: user.email,
            isAccountVerified:user.isAccountVerified,
            role:user.role,
            balance:user.balance,
            farmName:user.farmName,
            phone:user.phone,
            country:user.country,
            city:user.city,
            address:user.address,
            
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