const mongoose = require('mongoose');
const { Schema } = mongoose;

const communityPostSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'authorType'
    },
    authorType: {
        type: String,
        required: true,
        enum: ['users', 'workers']
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    tags: {
        type: [String],
        default: []
    },
    pictures: {
        type: [String],
        default: []
    },
    videos: {
        type: [String],
        default: []
    },
    likes: {
        type: [Schema.Types.ObjectId],
        default: []
    },
    views: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const CommunityPost = mongoose.model('CommunityPost', communityPostSchema);
module.exports = CommunityPost;
