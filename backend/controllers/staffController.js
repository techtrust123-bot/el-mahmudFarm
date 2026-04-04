// const Staff = require('../models/staff');

exports.addStaff = async(req,res)=>{
    const { Staff } = req.farmModels
    const {name,role,email,contact,salary,hireDate} = req.body
    if(!name || !role || !email || !contact || !salary || !hireDate){
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        const newStaff = new Staff({name,role,email,contact,salary,hireDate});
        await newStaff.save();
        res.status(201).json({success:true,message:"Staff added successfully..."});
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
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