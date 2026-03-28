const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();


exports.connectDb = async (req, res) =>{
    try {
        await mongoose.connect(process.env.MONGO_URL, {
        });
        console.log('DB Connected');
    } catch (error) {
        console.error('DB Connection Error:', error);
    }
}