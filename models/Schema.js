const mongoose = require('mongoose');

// c7Yxq8IEGeaZSYh7
// LLKr6nVahSddfruG

const userSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true
    },
    email: {
        type:String,
        required:true
    },
    password: {
        type:String,
        required:true
    },
})



const Users = mongoose.model('Users', userSchema);

module.exports = Users