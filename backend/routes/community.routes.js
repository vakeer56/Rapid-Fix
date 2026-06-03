const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload.js');
const authMiddleware = require('../middleware/auth.middleware');
const optionalAuth = require('../middleware/optionalAuth.middleware');

const {
    createPost,
    getPosts,
    getPostById,
    likePost,
    createComment,
    getCommentsByPostId,
    likeComment,
    deletePost,
    deleteComment
} = require('../controllers/community.controller');

// Post routes
router.post('/posts', 
    authMiddleware, 
    upload.fields([
        { name: 'picture', maxCount: 10 },
        { name: 'video', maxCount: 5 }
    ]), 
    createPost
);

router.get('/posts', optionalAuth, getPosts);
router.get('/posts/:id', optionalAuth, getPostById);
router.delete('/posts/:id', authMiddleware, deletePost);
router.post('/posts/:id/like', authMiddleware, likePost);

// Comment routes
router.post('/posts/:id/comments', 
    authMiddleware, 
    upload.fields([
        { name: 'picture', maxCount: 5 },
        { name: 'video', maxCount: 2 }
    ]), 
    createComment
);

router.get('/posts/:id/comments', optionalAuth, getCommentsByPostId);
router.post('/comments/:id/like', authMiddleware, likeComment);
router.delete('/comments/:id', authMiddleware, deleteComment);

module.exports = router;
