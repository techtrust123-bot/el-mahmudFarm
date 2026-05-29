// const Staff = require('../models/staff');
const authModel = require('../models/auth');
const bcrypt = require('bcryptjs')

// exports.addStaff = async(req,res)=>{
//     const { Staff } = req.farmModels
//     const {name,role,email,contact,salary,hireDate} = req.body
//     if(!name || !role || !email || !contact || !salary || !hireDate){
//         return res.status(400).json({ message: 'All fields are required' });
//     }
//     try {
//         const newStaff = new Staff({name,role,email,contact,salary,hireDate});
//         await newStaff.save();
//         res.status(201).json({success:true,message:"Staff added successfully..."});
//     } catch (error) {
//         console.log(error);
//         res.status(400).json({ success: false, message: error.message });
//     }
// }

exports.addStaff = async (req, res) => {
    const { Staff } = req.farmModels
    const { name, role, email, password, contact, salary, hireDate, permissions } = req.body

    if (!name || !role || !email || !password || !contact || !salary || !hireDate) {
        return res.status(400).json({ message: 'All fields are required' })
    }

    try {
       
        const existingUser = await authModel.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' })
        }

        const hashPassword = await bcrypt.hash(password, 12)

        
        const newAuthUser = new authModel({
            name,
            email,
            password: hashPassword,
            role,
            userType: 'staff',
            farmId: req.user.farmId,        // ✅ link staff to manager's farm
            permissions: Array.isArray(permissions) ? permissions : [],
            createdBy: req.user.id,
            contact: contact || '',
            salary: Number(salary) || 0,
            hireDate: hireDate ? new Date(hireDate) : null,
            isAccountVerified: true,        // ✅ staff don't need email verification
        })
        await newAuthUser.save()

        // ✅ Step 2 — Save to FARM DB for farm-specific staff management
        const newStaff = new Staff({
            authUserId: newAuthUser._id,    // ✅ link back to auth record
            name,
            role,
            email,
            contact,
            salary: Number(salary),
            hireDate: hireDate ? new Date(hireDate) : null,
            permissions: Array.isArray(permissions) ? permissions : [],
        })
        await newStaff.save()

        
        const { password: _, ...staffData } = newAuthUser.toObject()

        res.status(201).json({
            success: true,
            message: 'Staff added successfully',
            data: staffData
        })

    } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
    }
}

exports.getStaff = async(req,res)=>{
    const { Staff } = req.farmModels
    try {
        const staff = await Staff.find();
        if(staff.length === 0){
            return res.status(404).json({success:false,message:"No staff found..."})
        }
        res.status(200).json({success:true,message:"Staff retrieved successfully...",data:staff});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
}

exports.getStaffById = async(req,res)=>{
    const { Staff } = req.farmModels
    const id = req.params.id
    try {
        const staff = await Staff.findById(id);
        if(!staff){
            return res.status(404).json({success:false,message:"Staff not found..."})
        }
        res.status(200).json({success:true,message:"Staff retrieved successfully...",data:staff});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
}

exports.updateStaff = async(req,res)=>{
    const { Staff } = req.farmModels
    
    try {
        const staff = await Staff.findById(id);
        if(!staff){
            return res.status(404).json({success:false,message:"Staff not found..."})
        }
        const updatedStaff = await Staff.findByIdAndUpdate(id,req.body,{returnDocument:'after'})
        res.status(200).json({success:true,message:"Staff updated successfully...",data:updatedStaff});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
}

exports.deleteStaff = async(req,res)=>{
    const { Staff } = req.farmModels
    const id = req.params.id
    try {
        const staff = await Staff.findById(id);
        if(!staff){
            return res.status(404).json({success:false,message:"Staff not found..."})
        }
        await Staff.findByIdAndDelete(id)
        res.status(200).json({success:true,message:"Staff deleted successfully..."});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server Error' });
}
}

exports.staffCount = async(req,res)=>{
    const { Staff } = req.farmModels
    try {
        const count = await Staff.countDocuments();
        res.status(200).json({ success: true, message: "Staff count retrieved successfully...", data: { count } });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
}