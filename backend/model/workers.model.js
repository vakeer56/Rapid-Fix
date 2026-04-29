const mongoose = require('mongoose');


const workersSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true                            
        },
        age: {
            type: Number,
            required: true
        },
        experience: {
            type: Number,
            required: true
        },
        rating: {
            average: {
                type: Number,
                default: 0
            },
            totalCount: {
                type: Number,
                default: 0
            }
        },
        preferred_areas: {
            type: [String],
            default: []
        },
        located_address: {
            type: String
        },
        located_area: {
            type: String
        },
        verificationStatus: {
            type: Boolean,
            default: false
        },
        firebaseUid: {
            type: String,    
            required: true,
            unique: true
        }
});      

const workersModel = mongoose.model("workers", workersSchema);

module.exports = workersModel;