const mongoose = require('mongoose');


const fileSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true
    },
    file: {
        data:Buffer,
        contentType: String,
        required: true
    }
})



const File = mongoose.model('File', fileSchema);

module.exports =  File;  