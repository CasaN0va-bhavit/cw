const mongoose = require('mongoose');


const missionSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true
    },
    agent: {
        type:String,
        required:true
    }
})



const Missons = mongoose.model('Missions', missionSchema);

module.exports = Misssions