const CommunityPost = require('../model/communityPost.model');
const CommunityComment = require('../model/communityComment.model');
const cloudinary = require('../config/cloudinary.js');
const fs = require('fs');

// Helper function to upload media files to Cloudinary
const uploadMedia = async (files, folder, resourceType = 'auto') => {
    const urls = [];
    if (files && files.length > 0) {
        for (const file of files) {
            const filePath = file.path;
            try {
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: folder,
                    resource_type: resourceType
                });
                urls.push(result.secure_url);
            } catch (err) {
                console.error(`[Cloudinary Upload Error] Path: ${filePath}`, err);
            } finally {
                try {
                    fs.unlinkSync(filePath);
                } catch (unlinkErr) {
                    console.warn(`[Temp File Clean Warning] Path: ${filePath}`, unlinkErr.message);
                }
            }
        }
    }
    return urls;
};

// 1. Create a Community Post
exports.createPost = async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        const userId = req.user.sub;
        const role = req.user.role; // 'user' or 'worker'

        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Title and content are required' });
        }

        // Map role to collection model name
        const authorType = role === 'worker' ? 'workers' : 'users';

        // Upload media if present
        const pictures = await uploadMedia(req.files?.picture, 'rapidfix/community/images', 'image');
        const videos = await uploadMedia(req.files?.video, 'rapidfix/community/videos', 'video');

        // Parse tags
        let parsedTags = [];
        if (tags) {
            parsedTags = Array.isArray(tags)
                ? tags
                : String(tags).split(',').map(t => t.trim()).filter(Boolean);
        }

        const newPost = new CommunityPost({
            author: userId,
            authorType,
            title,
            content,
            tags: parsedTags,
            pictures,
            videos
        });

        await newPost.save();
        
        // Populate author before returning
        await newPost.populate({ path: 'author', select: 'name photo rating verificationStatus' });

        return res.status(201).json({ success: true, post: newPost });
    } catch (error) {
        console.error('[createPost Controller Error]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// 2. Fetch all Posts with search and filtering
exports.getPosts = async (req, res) => {
    try {
        const { search, tag, sort } = req.query;
        let query = {};

        // Filter by Tag
        if (tag) {
            query.tags = tag;
        }

        // Search in title and content
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        let postsQuery = CommunityPost.find(query)
            .populate({ path: 'author', select: 'name photo rating verificationStatus' });

        // Sorting
        if (sort === 'popular') {
            // Sort by likes length descending and views descending
            // Mongoose aggregate is needed for dynamic sorting on array length easily,
            // or we can sort in memory. Let's do it using aggregation or sort by views / createdAt.
            // Sorting by views is a good proxy for popularity if aggregation is complex, 
            // but we can use aggregate if we want. Let's do a simple sort by views + createdAt
            postsQuery = postsQuery.sort({ views: -1, createdAt: -1 });
        } else {
            postsQuery = postsQuery.sort({ createdAt: -1 });
        }

        const posts = await postsQuery;

        return res.json({ success: true, posts });
    } catch (error) {
        console.error('[getPosts Controller Error]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// 3. Fetch a Single Post by ID
exports.getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await CommunityPost.findById(id)
            .populate({ path: 'author', select: 'name photo rating verificationStatus' });

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        // Increment view count asynchronously
        post.views = (post.views || 0) + 1;
        await post.save();

        return res.json({ success: true, post });
    } catch (error) {
        console.error('[getPostById Controller Error]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// 4. Like/Unlike a Post
exports.likePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.sub;

        const post = await CommunityPost.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const likedIndex = post.likes.indexOf(userId);
        let liked = false;

        if (likedIndex > -1) {
            // Already liked, so unlike it
            post.likes.splice(likedIndex, 1);
        } else {
            // Like it
            post.likes.push(userId);
            liked = true;
        }

        await post.save();
        return res.json({ success: true, likes: post.likes, liked });
    } catch (error) {
        console.error('[likePost Controller Error]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// 5. Create a Comment / Reply
exports.createComment = async (req, res) => {
    try {
        const { id } = req.params; // Post ID
        const { content, parentComment } = req.body;
        const userId = req.user.sub;
        const role = req.user.role; // 'user' or 'worker'

        if (!content) {
            return res.status(400).json({ success: false, message: 'Comment content is required' });
        }

        const post = await CommunityPost.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const authorType = role === 'worker' ? 'workers' : 'users';

        // Upload media attachments if any
        const pictures = await uploadMedia(req.files?.picture, 'rapidfix/community/comments/images', 'image');
        const videos = await uploadMedia(req.files?.video, 'rapidfix/community/comments/videos', 'video');

        const newComment = new CommunityComment({
            post: id,
            parentComment: parentComment || null,
            author: userId,
            authorType,
            content,
            pictures,
            videos
        });

        await newComment.save();
        await newComment.populate({ path: 'author', select: 'name photo rating verificationStatus' });

        return res.status(201).json({ success: true, comment: newComment });
    } catch (error) {
        console.error('[createComment Controller Error]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// 6. Get Comments for a Post
exports.getCommentsByPostId = async (req, res) => {
    try {
        const { id } = req.params; // Post ID
        const comments = await CommunityComment.find({ post: id })
            .populate({ path: 'author', select: 'name photo rating verificationStatus' })
            .sort({ createdAt: 1 }); // Oldest first to preserve thread order

        return res.json({ success: true, comments });
    } catch (error) {
        console.error('[getCommentsByPostId Controller Error]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// 7. Like/Unlike a Comment
exports.likeComment = async (req, res) => {
    try {
        const { id } = req.params; // Comment ID
        const userId = req.user.sub;

        const comment = await CommunityComment.findById(id);
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        const likedIndex = comment.likes.indexOf(userId);
        let liked = false;

        if (likedIndex > -1) {
            comment.likes.splice(likedIndex, 1);
        } else {
            comment.likes.push(userId);
            liked = true;
        }

        await comment.save();
        return res.json({ success: true, likes: comment.likes, liked });
    } catch (error) {
        console.error('[likeComment Controller Error]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// 8. Delete a Post
exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.sub;
        const role = req.user.role;

        const post = await CommunityPost.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        // Authorize: Only the author or an admin can delete the post
        if (post.author.toString() !== userId && role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized action' });
        }

        // Delete the post
        await CommunityPost.findByIdAndDelete(id);

        // Delete all comments associated with this post
        await CommunityComment.deleteMany({ post: id });

        return res.json({ success: true, message: 'Post and its comments deleted successfully' });
    } catch (error) {
        console.error('[deletePost Controller Error]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// 9. Delete a Comment
exports.deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.sub;
        const role = req.user.role;

        const comment = await CommunityComment.findById(id);
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        // Authorize: Only comment author, post author, or admin can delete the comment
        const post = await CommunityPost.findById(comment.post);
        const isPostAuthor = post && post.author.toString() === userId;

        if (comment.author.toString() !== userId && !isPostAuthor && role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized action' });
        }

        // Delete the comment
        await CommunityComment.findByIdAndDelete(id);

        // Recursively or nested: delete child replies. For simple structure, let's delete sub-comments that point to this parentComment.
        await CommunityComment.deleteMany({ parentComment: id });

        return res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('[deleteComment Controller Error]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};
