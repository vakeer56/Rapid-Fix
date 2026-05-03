const multer = require('multer');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        //stores the incoming file in /uploads in mem
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

module.exports = upload;