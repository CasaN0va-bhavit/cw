const mongoose = require('mongoose');

// c7Yxq8IEGeaZSYh7

mongoose.connect("mongodb+srv://bhavitgrover:c7Yxq8IEGeaZSYh7@login.ly7rioo.mongodb.net/?retryWrites=true&w=majority")
.then(() => {
    console.log("Mongo Connected");
})
.catch(() => {
    console.log("failed you loser");
})


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