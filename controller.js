const UploadModel = require('./models/UploadSchema');
const fs = require('fs');
const { error } = require('console');


exports.home = async(req, res) => {
    const all_images = await UploadModel.find();
    res.render('main',{images:all_images});
}
exports.uploads = (req, res, next) => {
    
 }