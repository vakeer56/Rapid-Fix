const Problem = require('../model/problem.model');
const cloudinary = require('../config/cloudinary.js');

exports.createProblem = async (req, res) => {

    try {
        const {userId, name, description, address, urgency} = req.body;

        let pictureUrl = null;
        let videoUrl = null;

        if(req.files?.picture) {

            const filePath = req.files.picture[0].path;

            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'rapidfix/images'
            });

            pictureUrl = result.secure_url;

            const fs = require('fs');
            fs.unlinkSync(filePath);
        }

        if(req.files?.video) {
            
            const filePath = req.files.video[0].path;

            const result = await cloudinary.uploader.upload(filePath, {
                resource_type: 'video',
                folder: 'rapidfix/videos'
            });

            videoUrl = result.secure_url;

            const fs = require('fs');
            fs.unlinkSync(filePath);
        }

        const newProblem = new Problem( {
            userId,
            picture: pictureUrl,
            video: videoUrl,
            name,
            description,
            address,
            urgency
        });

        await newProblem.save();
        res.status(201).json(newProblem)

    }
    catch(err) {
        res.status(400).json( { message: err.message } );
    }
}