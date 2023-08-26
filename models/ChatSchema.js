const mongoose = require('mongoose');
// PqBxq4q4oaC1M01T


const chatSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true
    },
    message: {
        type: String,
        required: true
    },
    realMessage : {
        type: String,
        required: true
    }
})



const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat