const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
    path: {
        type: String,
        required: true,
      },
      originalName: {
        type: String,
        required: true,
      },
      password: String
})



const File = mongoose.model('uploads', uploadSchema);

module.exports =  File; 