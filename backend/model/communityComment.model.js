const mongoose = require('mongoose');
const { Schema } = mongoose;

const communityCommentSchema = new Schema({
    post: {
        type: Schema.Types.ObjectId,
        ref: 'CommunityPost',
        required: true
    },
    parentComment: {
        type: Schema.Types.ObjectId,
        ref: 'CommunityComment',
        default: null
    },
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
    content: {
        type: String,
        required: true,
        trim: true
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
    }
}, { timestamps: true });

const CommunityComment = mongoose.model('CommunityComment', communityCommentSchema);
module.exports = CommunityComment;
