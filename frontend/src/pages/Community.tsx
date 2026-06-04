import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { usePopup } from "../context/PopupContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../service/api";
import {
  MessageSquare,
  Eye,
  Plus,
  Search,
  Filter,
  Send,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Loader2,
  Wrench,
  Heart,
  Sparkles,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Trash2
} from "lucide-react";

interface Author {
  _id: string;
  name: string;
  photo: string;
  rating?: {
    totalSum: number;
    totalCount: number;
  };
  verificationStatus?: boolean;
}

interface Post {
  _id: string;
  author: Author;
  authorType: "users" | "workers";
  title: string;
  content: string;
  tags: string[];
  pictures: string[];
  videos: string[];
  likes: string[];
  views: number;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  _id: string;
  post: string;
  parentComment: string | null;
  author: Author;
  authorType: "users" | "workers";
  content: string;
  pictures: string[];
  videos: string[];
  likes: string[];
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

const AVAILABLE_TAGS = [
  "Plumbing",
  "Electrical",
  "AC & Cooling",
  "Appliance Repair",
  "Carpentry",
  "Emergency",
  "Tips & Guides",
  "General"
];

export default function Community() {
  const { appUser, isAuthenticated } = useAuth();
  const { showAlert, showConfirm } = usePopup();

  // Feed States
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [sort, setSort] = useState<"latest" | "popular">("latest");

  // Selected Post Details Modal/View
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [detailedPost, setDetailedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [newCommentContent, setNewCommentContent] = useState<string>("");
  const [commentPictures, setCommentPictures] = useState<File[]>([]);
  const [commentPicturePreviews, setCommentPicturePreviews] = useState<string[]>([]);
  const [commentVideos, setCommentVideos] = useState<File[]>([]);
  const [commentVideoPreviews, setCommentVideoPreviews] = useState<{ name: string; size: string }[]>([]);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [commentSubmitLoading, setCommentSubmitLoading] = useState<boolean>(false);

  // New Post Modal State
  const [isNewPostOpen, setIsNewPostOpen] = useState<boolean>(false);
  const [postTitle, setPostTitle] = useState<string>("");
  const [postContent, setPostContent] = useState<string>("");
  const [postTags, setPostTags] = useState<string[]>([]);
  const [postPictures, setPostPictures] = useState<File[]>([]);
  const [postPicturePreviews, setPostPicturePreviews] = useState<string[]>([]);
  const [postVideos, setPostVideos] = useState<File[]>([]);
  const [postVideoPreviews, setPostVideoPreviews] = useState<{ name: string; size: string }[]>([]);
  const [postSubmitLoading, setPostSubmitLoading] = useState<boolean>(false);
  const [postError, setPostError] = useState<string>("");

  // Initial Fetch
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTag, sort]);

  // Prefill new post draft if redirected from AI assistant
  useEffect(() => {
    const savedDraft = localStorage.getItem("rf_community_draft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setPostTitle(draft.title || "");
        setPostContent(draft.content || "");
        if (draft.tags) {
          const formattedTags = Array.isArray(draft.tags) 
            ? draft.tags 
            : typeof draft.tags === "string" 
              ? (draft.tags as string).split(",") 
              : [];
          setPostTags(formattedTags.map((t: string) => t.trim()));
        }
        setIsNewPostOpen(true);
      } catch (e) {
        console.error("Failed to parse prefilled community draft:", e);
      } finally {
        localStorage.removeItem("rf_community_draft");
      }
    }
  }, []);

  const handleDeletePost = async (postId: string) => {
    const confirmDelete = await showConfirm(
      "Delete Post",
      "Are you sure you want to delete this post? This action will permanently remove the post and all its comments."
    );
    if (!confirmDelete) return;

    try {
      const res = await api.delete(`/community/posts/${postId}`);
      if (res.data && res.data.success) {
        await showAlert("Success", "Post deleted successfully.", "success");
        if (selectedPostId === postId) {
          setSelectedPostId(null);
          setDetailedPost(null);
          setComments([]);
        }
        fetchPosts();
      }
    } catch (err: any) {
      await showAlert(
        "Error",
        "Failed to delete post: " + (err.response?.data?.message || err.message),
        "error"
      );
    }
  };

  const refreshComments = async (postId: string) => {
    try {
      const commentRes = await api.get(`/community/posts/${postId}/comments`);
      if (commentRes.data && commentRes.data.success) {
        setComments(commentRes.data.comments);
      }
    } catch (err) {
      console.error("Error refreshing comments:", err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirmDelete = await showConfirm(
      "Delete Comment",
      "Are you sure you want to delete this comment? This will also delete any replies to this comment."
    );
    if (!confirmDelete) return;

    try {
      const res = await api.delete(`/community/comments/${commentId}`);
      if (res.data && res.data.success) {
        await showAlert("Success", "Comment deleted successfully.", "success");
        if (selectedPostId) {
          refreshComments(selectedPostId);
        }
      }
    } catch (err: any) {
      await showAlert(
        "Error",
        "Failed to delete comment: " + (err.response?.data?.message || err.message),
        "error"
      );
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const tagQuery = selectedTag ? `&tag=${selectedTag}` : "";
      const searchQuery = search ? `&search=${search}` : "";
      const res = await api.get(`/community/posts?sort=${sort}${tagQuery}${searchQuery}`);
      if (res.data && res.data.success) {
        setPosts(res.data.posts);
      }
    } catch (err) {
      console.error("Error fetching community posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  // View Single Post details
  const handleViewPost = async (postId: string) => {
    setSelectedPostId(postId);
    setCommentsLoading(true);
    try {
      // 1. Fetch Post details
      const postRes = await api.get(`/community/posts/${postId}`);
      if (postRes.data && postRes.data.success) {
        setDetailedPost(postRes.data.post);
        // Update post in the list views
        setPosts(prev => prev.map(p => p._id === postId ? postRes.data.post : p));
      }

      // 2. Fetch comments
      const commentRes = await api.get(`/community/posts/${postId}/comments`);
      if (commentRes.data && commentRes.data.success) {
        setComments(commentRes.data.comments);
      }
    } catch (err) {
      console.error("Error fetching detailed post:", err);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Close Post details view
  const handleCloseDetailedView = () => {
    setSelectedPostId(null);
    setDetailedPost(null);
    setComments([]);
    setNewCommentContent("");
    setReplyingToCommentId(null);
    clearCommentMedia();
  };

  const clearCommentMedia = () => {
    setCommentPictures([]);
    setCommentPicturePreviews([]);
    setCommentVideos([]);
    setCommentVideoPreviews([]);
  };

  // Like / Unlike Post
  const handleLikePost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      await showAlert("Sign In Required", "Please sign in to like this post.", "warning");
      return;
    }

    try {
      const res = await api.post(`/community/posts/${postId}/like`);
      if (res.data && res.data.success) {
        // Toggle like in posts lists
        setPosts(prev =>
          prev.map(p =>
            p._id === postId ? { ...p, likes: res.data.likes } : p
          )
        );
        // Toggle like in detailed view
        if (detailedPost && detailedPost._id === postId) {
          setDetailedPost(prev => prev ? { ...prev, likes: res.data.likes } : null);
        }
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  // Like / Unlike Comment
  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      await showAlert("Sign In Required", "Please sign in to like comments.", "warning");
      return;
    }

    try {
      const res = await api.post(`/community/comments/${commentId}/like`);
      if (res.data && res.data.success) {
        setComments(prev =>
          prev.map(c =>
            c._id === commentId ? { ...c, likes: res.data.likes } : c
          )
        );
      }
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  // Handle media changes
  const handlePostFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files) {
      const filesArray = Array.from(files);
      if (name === "picture") {
        if (postPictures.length + filesArray.length > 5) {
          setPostError("Maximum of 5 photos allowed");
          return;
        }
        setPostPictures(prev => [...prev, ...filesArray]);
        setPostPicturePreviews(prev => [
          ...prev,
          ...filesArray.map(file => URL.createObjectURL(file))
        ]);
      } else if (name === "video") {
        if (postVideos.length + filesArray.length > 2) {
          setPostError("Maximum of 2 videos allowed");
          return;
        }
        setPostVideos(prev => [...prev, ...filesArray]);
        setPostVideoPreviews(prev => [
          ...prev,
          ...filesArray.map(file => ({
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          }))
        ]);
      }
    }
  };

  const handleCommentFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files) {
      const filesArray = Array.from(files);
      if (name === "picture") {
        if (commentPictures.length + filesArray.length > 3) {
          await showAlert("Limit Exceeded", "Maximum of 3 photos allowed", "warning");
          return;
        }
        setCommentPictures(prev => [...prev, ...filesArray]);
        setCommentPicturePreviews(prev => [
          ...prev,
          ...filesArray.map(file => URL.createObjectURL(file))
        ]);
      } else if (name === "video") {
        if (commentVideos.length + filesArray.length > 1) {
          await showAlert("Limit Exceeded", "Maximum of 1 video allowed", "warning");
          return;
        }
        setCommentVideos(prev => [...prev, ...filesArray]);
        setCommentVideoPreviews(prev => [
          ...prev,
          ...filesArray.map(file => ({
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          }))
        ]);
      }
    }
  };

  const removePostPicture = (index: number) => {
    setPostPictures(prev => prev.filter((_, i) => i !== index));
    setPostPicturePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removePostVideo = (index: number) => {
    setPostVideos(prev => prev.filter((_, i) => i !== index));
    setPostVideoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeCommentPicture = (index: number) => {
    setCommentPictures(prev => prev.filter((_, i) => i !== index));
    setCommentPicturePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeCommentVideo = (index: number) => {
    setCommentVideos(prev => prev.filter((_, i) => i !== index));
    setCommentVideoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Community Post
  const handleCreatePostSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPostError("");
    setPostSubmitLoading(true);

    if (!postTitle || !postContent) {
      setPostError("Title and content are required.");
      setPostSubmitLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append("title", postTitle);
      data.append("content", postContent);
      data.append("tags", postTags.join(","));

      postPictures.forEach(pic => {
        data.append("picture", pic);
      });
      postVideos.forEach(vid => {
        data.append("video", vid);
      });

      const res = await api.post("/community/posts", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data && res.data.success) {
        setPosts(prev => [res.data.post, ...prev]);
        setIsNewPostOpen(false);
        setPostTitle("");
        setPostContent("");
        setPostTags([]);
        setPostPictures([]);
        setPostPicturePreviews([]);
        setPostVideos([]);
        setPostVideoPreviews([]);
      }
    } catch (err: any) {
      setPostError(err.response?.data?.message || err.message || "Failed to create post.");
    } finally {
      setPostSubmitLoading(false);
    }
  };

  // Submit Main Post Comment
  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim()) return;
    setCommentSubmitLoading(true);

    try {
      const data = new FormData();
      data.append("content", newCommentContent);

      commentPictures.forEach(pic => {
        data.append("picture", pic);
      });
      commentVideos.forEach(vid => {
        data.append("video", vid);
      });

      const res = await api.post(`/community/posts/${selectedPostId}/comments`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data && res.data.success) {
        setComments(prev => [...prev, res.data.comment]);
        setNewCommentContent("");
        clearCommentMedia();
      }
    } catch (err) {
      console.error("Error creating main post comment:", err);
    } finally {
      setCommentSubmitLoading(false);
    }
  };

  // Submit Comment Reply
  const onSubmitReply = async (content: string, parentCommentId: string, pictures: File[], videos: File[]) => {
    setCommentSubmitLoading(true);
    try {
      const data = new FormData();
      data.append("content", content);
      data.append("parentComment", parentCommentId);

      pictures.forEach(pic => {
        data.append("picture", pic);
      });
      videos.forEach(vid => {
        data.append("video", vid);
      });

      const res = await api.post(`/community/posts/${selectedPostId}/comments`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data && res.data.success) {
        setComments(prev => [...prev, res.data.comment]);
        setReplyingToCommentId(null);
      }
    } catch (err) {
      console.error("Error creating comment reply:", err);
    } finally {
      setCommentSubmitLoading(false);
    }
  };

  // Toggle Tags helper
  const handleTagToggle = (tag: string) => {
    setPostTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Format Dates helper
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Generate User Initials
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Comment Tree Builder
  const commentTree = (() => {
    const map: { [key: string]: Comment & { replies: Comment[] } } = {};
    const roots: Comment[] = [];

    comments.forEach(comment => {
      map[comment._id] = { ...comment, replies: [] };
    });

    comments.forEach(comment => {
      const parentVal = comment.parentComment;
      const parentId = typeof parentVal === "object" && parentVal !== null
        ? (parentVal as any)._id
        : parentVal;

      if (parentId && map[parentId]) {
        map[parentId].replies.push(map[comment._id]);
      } else {
        roots.push(map[comment._id]);
      }
    });

    return roots;
  })();

  // Recursive Comment Component has been moved outside of parent component to avoid React remounting issues  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Navbar />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        
        {selectedPostId && detailedPost ? (
          /* ── POST DETAILS / DISCUSSION TREE VIEW ── */
          <div className="animate-fade-in space-y-6">
            
            {/* Header / Back Action */}
            <button
              onClick={handleCloseDetailedView}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 transition-all font-extrabold text-xs text-slate-650 dark:text-slate-300 cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft size={14} />
              Back to Community Feed
            </button>

            {/* Main Post Card */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm rounded-3xl p-6 md:p-8 space-y-5">
              
              {/* Post Author info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {detailedPost.author?.photo ? (
                    <img
                      src={detailedPost.author.photo}
                      alt={detailedPost.author.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold ${detailedPost.authorType === "workers" ? "bg-gradient-to-tr from-amber-500 to-orange-500" : "bg-gradient-to-tr from-blue-600 to-indigo-600"}`}>
                      {getInitials(detailedPost.author?.name || "")}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-800 dark:text-white">
                        {detailedPost.author?.name}
                      </span>
                      {detailedPost.authorType === "workers" && (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                          detailedPost.author?.verificationStatus
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                            : "bg-slate-500/10 border-slate-500/30 text-slate-500 dark:text-slate-400"
                        }`}>
                          <Wrench size={8} />
                          {detailedPost.author?.verificationStatus ? "Verified Worker" : "Worker"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <Calendar size={10} />
                      <span>{formatDate(detailedPost.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Eye size={12} />
                    <span>{detailedPost.views} views</span>
                  </div>
                  {appUser && (detailedPost.author?._id === appUser._id || appUser.role === "admin") && (
                    <button
                      onClick={() => handleDeletePost(detailedPost._id)}
                      className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors cursor-pointer font-bold text-xs"
                      title="Delete Post"
                    >
                      <Trash2 size={13} />
                      <span>Delete Post</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Tags */}
              <div className="space-y-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {detailedPost.title}
                </h1>
                <div className="flex flex-wrap gap-1.5">
                  {detailedPost.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 text-blue-600 dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Body */}
              <p className="text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-line">
                {detailedPost.content}
              </p>

              {/* Media elements */}
              {(detailedPost.pictures?.length > 0 || detailedPost.videos?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {detailedPost.pictures?.map((pic, idx) => (
                    <a
                      href={pic}
                      target="_blank"
                      rel="noreferrer"
                      key={idx}
                      className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 group shadow-md"
                    >
                      <img src={pic} alt="Post Attachment" className="w-full h-full object-cover max-h-72" />
                    </a>
                  ))}
                  {detailedPost.videos?.map((vid, idx) => (
                    <div key={idx} className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center shadow-md">
                      <video src={vid} controls className="w-full max-h-72 object-contain" />
                    </div>
                  ))}
                </div>
              )}

              {/* Action count bars */}
              <div className="flex items-center gap-6 pt-4 border-t border-slate-250/20 dark:border-slate-800/20">
                <button
                  onClick={(e) => handleLikePost(e, detailedPost._id)}
                  className={`flex items-center gap-2 text-xs font-black transition-colors cursor-pointer ${
                    appUser && detailedPost.likes.includes(appUser._id)
                      ? "text-red-500 hover:text-red-600"
                      : "text-slate-400 hover:text-slate-500 dark:hover:text-slate-200"
                  }`}
                >
                  <Heart size={16} className={appUser && detailedPost.likes.includes(appUser._id) ? "fill-red-500" : ""} />
                  <span>{detailedPost.likes?.length || 0} Likes</span>
                </button>

                <div className="flex items-center gap-2 text-xs font-black text-slate-400">
                  <MessageSquare size={16} />
                  <span>{comments.length} Replies</span>
                </div>
              </div>

            </div>

            {/* ── COMMENT BOX SECTION ── */}
            <div className="space-y-4">
              <h3 className="text-sm uppercase tracking-wider font-extrabold text-slate-400">
                Discussion ({comments.length})
              </h3>

              {isAuthenticated ? (
                /* Authenticated Comment Creator Box */
                <form onSubmit={handleCommentSubmit} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm rounded-2xl p-4 space-y-3">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Add a comment or answer
                  </span>
                  <textarea
                    value={newCommentContent}
                    onChange={e => setNewCommentContent(e.target.value)}
                    placeholder="Provide troubleshooting details, preventative recommendations..."
                    rows={3}
                    className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 rounded-xl p-3 text-sm outline-none resize-none"
                    required
                  />

                  {/* Attached uploads preview */}
                  {(commentPicturePreviews.length > 0 || commentVideoPreviews.length > 0) && (
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {commentPicturePreviews.map((src, i) => (
                        <div key={i} className="relative w-14 h-14 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                          <img src={src} className="w-full h-full object-cover rounded-lg" alt="Preview" />
                          <button
                            type="button"
                            onClick={() => removeCommentPicture(i)}
                            className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {commentVideoPreviews.map((vid, i) => (
                        <div key={i} className="relative w-20 h-14 rounded-lg bg-indigo-950/20 border border-indigo-900 shrink-0 flex flex-col justify-center items-center text-[8px] text-slate-300 p-1">
                          <VideoIcon size={14} />
                          <span className="truncate max-w-full font-bold">{vid.name}</span>
                          <button
                            type="button"
                            onClick={() => removeCommentVideo(i)}
                            className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex gap-2">
                      <label className="p-2 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs font-bold">
                        <ImageIcon size={14} />
                        Photo
                        <input
                          type="file"
                          name="picture"
                          multiple
                          accept="image/*"
                          onChange={handleCommentFileChange}
                          className="hidden"
                        />
                      </label>
                      <label className="p-2 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs font-bold">
                        <VideoIcon size={14} />
                        Video
                        <input
                          type="file"
                          name="video"
                          accept="video/*"
                          onChange={handleCommentFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={commentSubmitLoading}
                      className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-600 hover:from-indigo-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {commentSubmitLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}
                      Submit Comment
                    </button>
                  </div>
                </form>
              ) : (
                /* Guest View Comment call to action */
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm rounded-2xl p-5 text-center bg-slate-100/50 dark:bg-slate-900/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Want to participate? Sign in to comment, reply, and help the community!
                  </p>
                </div>
              )}

              {/* Nested Comments Render */}
              {commentsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="animate-spin text-indigo-500" />
                </div>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No replies yet. Be the first to answer this question!
                </div>
              ) : (
                <div className="space-y-4">
                  {commentTree.map(rootComment => (
                    <CommentNode
                      key={rootComment._id}
                      comment={rootComment}
                      depth={0}
                      replyingToCommentId={replyingToCommentId}
                      setReplyingToCommentId={setReplyingToCommentId}
                      handleLikeComment={handleLikeComment}
                      onSubmitReply={onSubmitReply}
                      commentSubmitLoading={commentSubmitLoading}
                      appUser={appUser}
                      formatDate={formatDate}
                      getInitials={getInitials}
                      onDeleteComment={handleDeleteComment}
                      postAuthorId={detailedPost?.author?._id || ""}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* ── COMMUNITY FEED HOME ── */
          <div className="space-y-8 animate-slide-up">
            
            {/* Immersive Header Panel */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="text-indigo-500 fill-indigo-500" />
                  RapidFix Community
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                  Ask repair questions, troubleshoot common problems, and receive verified answers from background-verified trade experts and homeowners.
                </p>
              </div>

              {isAuthenticated ? (
                <button
                  onClick={() => setIsNewPostOpen(true)}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2 cursor-pointer transition-all shrink-0"
                >
                  <Plus size={14} />
                  Ask a Question
                </button>
              ) : (
                <div className="text-xs bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 font-bold">
                  Sign in to post a question
                </div>
              )}
            </div>

            {/* Filter tags pill scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                onClick={() => setSelectedTag("")}
                className={`px-4 py-2 rounded-full text-xs font-extrabold cursor-pointer border transition-all ${
                  selectedTag === ""
                    ? "bg-indigo-600 dark:bg-indigo-600 text-white border-indigo-600 dark:border-indigo-600 shadow-md"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
                }`}
              >
                All Topics
              </button>
              {AVAILABLE_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold cursor-pointer border transition-all whitespace-nowrap ${
                    selectedTag === tag
                      ? "bg-indigo-600 dark:bg-indigo-600 text-white border-indigo-600 dark:border-indigo-600 shadow-md"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Filter Search Input and Sorting */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
                <input
                  type="text"
                  placeholder="Search questions or problems..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-sm outline-none"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      // Force reload all
                      setTimeout(() => fetchPosts(), 0);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </form>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Filter size={12} />
                  Sort by:
                </span>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as "latest" | "popular")}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none cursor-pointer text-slate-650 dark:text-white"
                >
                  <option value="latest">Newest First</option>
                  <option value="popular">Popular Discussions</option>
                </select>
              </div>
            </div>

            {/* Feed posts mapping */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-slate-250 dark:border-slate-800 rounded-3xl bg-slate-500/5">
                <MessageSquare className="mx-auto text-slate-400 w-12 h-12 mb-3" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">No discussions found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Be the first to open a thread on this subject! Press "Ask a Question" above to start the discussion.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {posts.map(post => {
                  const isWorker = post.authorType === "workers";
                  const totalLikes = post.likes?.length || 0;
                  const hasLiked = appUser ? post.likes?.includes(appUser._id) : false;

                  return (
                    <div
                      key={post._id}
                      onClick={() => handleViewPost(post._id)}
                      className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm hover-scale-premium rounded-2xl p-5 md:p-6 cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Feed Card Header */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            {post.author?.photo ? (
                              <img
                                src={post.author.photo}
                                alt={post.author.name}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${isWorker ? "bg-gradient-to-tr from-amber-500 to-orange-500" : "bg-gradient-to-tr from-blue-600 to-indigo-600"}`}>
                                {getInitials(post.author?.name || "")}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-extrabold text-slate-800 dark:text-white">
                                  {post.author?.name}
                                </span>
                                {isWorker && (
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-extrabold uppercase border ${
                                    post.author?.verificationStatus
                                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                                      : "bg-slate-500/10 border-slate-500/30 text-slate-500 dark:text-slate-400"
                                  }`}>
                                    <Wrench size={7} />
                                    {post.author?.verificationStatus ? "Verified Worker" : "Worker"}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                {formatDate(post.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-1.5">
                            {post.tags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 text-blue-600 dark:text-slate-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Title & snippet */}
                        <div className="space-y-1">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-500">
                            {post.title}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>
                        </div>

                        {/* Media indicators */}
                        {(post.pictures?.length > 0 || post.videos?.length > 0) && (
                          <div className="flex gap-2">
                            {post.pictures?.slice(0, 3).map((pic, i) => (
                              <div key={i} className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-850 overflow-hidden shrink-0">
                                <img src={pic} className="w-full h-full object-cover" alt="Attachment" />
                              </div>
                            ))}
                            {post.videos?.slice(0, 1).map((_, i) => (
                              <div key={i} className="w-12 h-12 rounded-lg border border-indigo-900/60 bg-indigo-950/20 flex flex-col justify-center items-center shrink-0 text-[8px] text-indigo-400 p-0.5">
                                <VideoIcon size={12} className="animate-pulse" />
                                <span className="font-bold">Clip</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Actions summary */}
                      <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-900 pt-3.5 mt-4 text-xs font-extrabold">
                        <button
                          onClick={(e) => handleLikePost(e, post._id)}
                          className={`flex items-center gap-1.5 cursor-pointer ${
                            hasLiked
                              ? "text-red-500 hover:text-red-650"
                              : "text-slate-400 hover:text-slate-500 dark:hover:text-slate-200"
                          }`}
                        >
                          <Heart size={14} className={hasLiked ? "fill-red-500" : ""} />
                          <span>{totalLikes}</span>
                        </button>

                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MessageSquare size={14} />
                          <span>Replies</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400 ml-auto text-[10px]">
                          <Eye size={12} />
                          <span>{post.views || 0}</span>
                          {appUser && (post.author?._id === appUser._id || appUser.role === "admin") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePost(post._id);
                              }}
                              className="flex items-center gap-1 text-red-500 hover:text-red-400 cursor-pointer ml-3 font-extrabold"
                              title="Delete Post"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </main>

      {/* ── ASK A QUESTION MODAL ── */}
      {isNewPostOpen && (
        <section className="fixed inset-0 z-[999] bg-slate-950 flex flex-col lg:flex-row overflow-hidden animate-fade-in font-sans">
          {/* Left panel branding */}
          <div className="hidden lg:flex lg:w-[35%] xl:w-[30%] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-900/60">
            <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-sm font-extrabold tracking-wider text-white uppercase">RapidFix Community</span>
            </div>

            <div className="relative z-10 space-y-6 my-auto">
              <h1 className="text-3xl font-extrabold text-white leading-tight">
                Ask the<br />
                <span className="bg-gradient-to-r from-indigo-400 to-violet-300 bg-clip-text text-transparent">
                  Community
                </span>
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Describe your appliance malfunction, plumbing leak, or DIY questions. Add diagnostic visuals so technicians can provide detailed advice.
              </p>
            </div>
          </div>

          {/* Right panel form */}
          <div className="flex-1 bg-white dark:bg-slate-950/95 backdrop-blur-xl relative flex flex-col justify-between overflow-y-auto">
            <button
              onClick={() => setIsNewPostOpen(false)}
              className="absolute top-6 right-8 z-10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:border-slate-700 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="w-full max-w-4xl mx-auto px-6 py-12 sm:px-12 md:py-16 my-auto">
              <form onSubmit={handleCreatePostSubmit} className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Ask your Question</h2>

                {postError && (
                  <div className="flex items-center gap-3 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl px-5 py-4">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{postError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Text details column */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 ml-0.5">Topic / Question Title</label>
                      <input
                        type="text"
                        value={postTitle}
                        onChange={e => setPostTitle(e.target.value)}
                        placeholder="e.g. How can I temporarily patch a copper plumbing pipe pinhole leak?"
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 ml-0.5">Describe in Detail</label>
                      <textarea
                        value={postContent}
                        onChange={e => setPostContent(e.target.value)}
                        placeholder="Describe the issue, what tools you have, and what you've tried..."
                        rows={6}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all text-sm resize-none scrollbar-thin"
                        required
                      />
                    </div>
                  </div>

                  {/* Tags & Uploads column */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Select Categories / Tags</label>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pb-1">
                        {AVAILABLE_TAGS.map(tag => {
                          const active = postTags.includes(tag);
                          return (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => handleTagToggle(tag)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                                active
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                  : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Upload visual assets */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Diagnostic Photos</label>
                        <label className="flex flex-col items-center justify-center border border-dashed rounded-xl p-2 cursor-pointer text-center h-24 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                          <ImageIcon size={16} className="text-slate-500 mb-1" />
                          <span className="text-[9px] font-bold text-slate-300">Upload Images</span>
                          <span className="text-[7px] text-slate-500 mt-0.5">Max 5 images</span>
                          <input type="file" name="picture" accept="image/*" multiple onChange={handlePostFileChange} className="hidden" />
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Diagnostic Videos</label>
                        <label className="flex flex-col items-center justify-center border border-dashed rounded-xl p-2 cursor-pointer text-center h-24 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                          <VideoIcon size={16} className="text-slate-500 mb-1" />
                          <span className="text-[9px] font-bold text-slate-300">Upload Clips</span>
                          <span className="text-[7px] text-slate-500 mt-0.5">Max 2 videos</span>
                          <input type="file" name="video" accept="video/*" multiple onChange={handlePostFileChange} className="hidden" />
                        </label>
                      </div>
                    </div>

                    {/* Attachment preview panel */}
                    {(postPicturePreviews.length > 0 || postVideoPreviews.length > 0) && (
                      <div className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/20 rounded-xl p-3 space-y-2">
                        <h4 className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Attached Media</h4>
                        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                          {postPicturePreviews.map((src, i) => (
                            <div key={i} className="relative w-12 h-12 rounded overflow-hidden shrink-0 border border-slate-800 group shadow-md">
                              <img src={src} className="w-full h-full object-cover" alt="Post Attachment" />
                              <button
                                type="button"
                                onClick={() => removePostPicture(i)}
                                className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-red-650 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          {postVideoPreviews.map((vid, i) => (
                            <div key={i} className="relative w-16 h-12 rounded bg-indigo-950/40 border border-indigo-900 flex flex-col justify-center items-center text-[7px] text-slate-300 p-1 shrink-0">
                              <VideoIcon size={12} className="text-indigo-400 mb-0.5" />
                              <span className="truncate max-w-full font-bold leading-tight">{vid.name}</span>
                              <button
                                type="button"
                                onClick={() => removePostVideo(i)}
                                className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-red-650 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submission bar */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={postSubmitLoading}
                    className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/10 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {postSubmitLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Publish Community Thread
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

// ── RECURSIVE REPLY FORM & COMMENT TREE COMPONENTS ──────────────────────────────────────

interface ReplyFormProps {
  authorName: string;
  onCancel: () => void;
  onSubmit: (content: string, pictures: File[], videos: File[]) => Promise<void>;
  loading: boolean;
}

function ReplyForm({ authorName, onCancel, onSubmit, loading }: ReplyFormProps) {
  const [content, setContent] = useState("");
  const [pictures, setPictures] = useState<File[]>([]);
  const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<{ name: string; size: string }[]>([]);

  const { showAlert } = usePopup();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files) {
      const filesArray = Array.from(files);
      if (name === "picture") {
        if (pictures.length + filesArray.length > 3) {
          await showAlert("Limit Exceeded", "Maximum of 3 photos allowed", "warning");
          return;
        }
        setPictures(prev => [...prev, ...filesArray]);
        setPicturePreviews(prev => [
          ...prev,
          ...filesArray.map(file => URL.createObjectURL(file))
        ]);
      } else if (name === "video") {
        if (videos.length + filesArray.length > 1) {
          await showAlert("Limit Exceeded", "Maximum of 1 video allowed", "warning");
          return;
        }
        setVideos(prev => [...prev, ...filesArray]);
        setVideoPreviews(prev => [
          ...prev,
          ...filesArray.map(file => ({
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          }))
        ]);
      }
    }
  };

  const removePicture = (index: number) => {
    setPictures(prev => prev.filter((_, i) => i !== index));
    setPicturePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit(content, pictures, videos);
    setContent("");
    setPictures([]);
    setPicturePreviews([]);
    setVideos([]);
    setVideoPreviews([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
          Replying to {authorName}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-650 dark:hover:text-white cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write your advice / solution..."
        rows={2}
        className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 rounded-lg p-2.5 text-sm outline-none resize-none"
        required
      />

      {/* Previews */}
      {(picturePreviews.length > 0 || videoPreviews.length > 0) && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {picturePreviews.map((src, i) => (
            <div key={i} className="relative w-12 h-12 rounded border border-slate-200 dark:border-slate-800 shrink-0">
              <img src={src} className="w-full h-full object-cover rounded" alt="Preview" />
              <button
                type="button"
                onClick={() => removePicture(i)}
                className="absolute top-0 right-0 bg-black/60 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
          {videoPreviews.map((vid, i) => (
            <div key={i} className="relative w-16 h-12 rounded bg-indigo-950/20 border border-indigo-900 shrink-0 flex flex-col justify-center items-center text-[7px] text-slate-300 p-1">
              <VideoIcon size={12} />
              <span className="truncate max-w-full font-bold">{vid.name}</span>
              <button
                type="button"
                onClick={() => removeVideo(i)}
                className="absolute top-0 right-0 bg-black/60 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <label className="p-1.5 rounded-lg border border-slate-205 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-880 cursor-pointer text-slate-500 dark:text-slate-400">
            <ImageIcon size={14} />
            <input
              type="file"
              name="picture"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <label className="p-1.5 rounded-lg border border-slate-205 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-880 cursor-pointer text-slate-500 dark:text-slate-400">
            <VideoIcon size={14} />
            <input
              type="file"
              name="video"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-600 hover:from-indigo-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Send size={12} />
          )}
          Send Reply
        </button>
      </div>
    </form>
  );
}

interface CommentNodeProps {
  comment: Comment;
  depth: number;
  replyingToCommentId: string | null;
  setReplyingToCommentId: (id: string | null) => void;
  handleLikeComment: (commentId: string) => Promise<void>;
  onSubmitReply: (content: string, parentCommentId: string, pictures: File[], videos: File[]) => Promise<void>;
  commentSubmitLoading: boolean;
  appUser: any;
  formatDate: (dateStr: string) => string;
  getInitials: (name: string) => string;
  onDeleteComment: (commentId: string) => void;
  postAuthorId: string;
}

function CommentNode({
  comment,
  depth = 0,
  replyingToCommentId,
  setReplyingToCommentId,
  handleLikeComment,
  onSubmitReply,
  commentSubmitLoading,
  appUser,
  formatDate,
  getInitials,
  onDeleteComment,
  postAuthorId
}: CommentNodeProps) {
  const isWorker = comment.authorType === "workers";
  const initials = getInitials(comment.author?.name || "");
  const totalLikes = comment.likes?.length || 0;
  const hasLiked = appUser ? comment.likes?.includes(appUser._id) : false;

  const isPostAuthor = postAuthorId === appUser?._id;
  const isCommentAuthor = comment.author?._id === appUser?._id;
  const isAdmin = appUser?.role === "admin";
  const canDelete = appUser && (isCommentAuthor || isPostAuthor || isAdmin);

  const maxIndentationDepth = 3;
  const indentationClass = depth > 0
    ? depth <= maxIndentationDepth
      ? "ml-4 md:ml-8 border-l border-slate-200 dark:border-slate-800 pl-4 mt-4"
      : "ml-2 border-l border-slate-200 dark:border-slate-800 pl-2 mt-4"
    : "border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 backdrop-blur-sm rounded-2xl p-4 mt-4";

  return (
    <div className={`flex flex-col ${indentationClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {comment.author?.photo ? (
            <img
              src={comment.author.photo}
              alt={comment.author.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isWorker ? "bg-gradient-to-tr from-amber-500 to-orange-500" : "bg-gradient-to-tr from-blue-600 to-indigo-600"}`}>
              {initials}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                {comment.author?.name}
              </span>
              {isWorker && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                  comment.author?.verificationStatus
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                    : "bg-slate-500/10 border-slate-500/30 text-slate-500 dark:text-slate-400"
                }`}>
                  <Wrench size={8} />
                  {comment.author?.verificationStatus ? "Verified Worker" : "Worker"}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">
              {formatDate(comment.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-slate-600 dark:text-slate-200 text-sm mt-2.5 leading-relaxed whitespace-pre-line">
        {comment.content}
      </p>

      {/* Comment media attachments */}
      {(comment.pictures?.length > 0 || comment.videos?.length > 0) && (
        <div className="flex flex-wrap gap-2.5 mt-3">
          {comment.pictures?.map((pic, idx) => (
            <a
              href={pic}
              target="_blank"
              rel="noreferrer"
              key={idx}
              className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-w-[200px]"
            >
              <img src={pic} alt="Comment Attachment" className="max-h-32 object-contain" />
            </a>
          ))}
          {comment.videos?.map((vid, idx) => (
            <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-w-[240px]">
              <video src={vid} controls className="max-h-36 object-contain" />
            </div>
          ))}
        </div>
      )}

      {/* Comment Actions */}
      <div className="flex items-center gap-4 mt-3">
        <button
          onClick={() => handleLikeComment(comment._id)}
          className={`flex items-center gap-1.5 text-xs font-extrabold transition-colors cursor-pointer ${
            hasLiked
              ? "text-red-500 hover:text-red-655"
              : "text-slate-400 hover:text-slate-550 dark:hover:text-slate-255"
          }`}
        >
          <Heart size={13} className={hasLiked ? "fill-red-500" : ""} />
          <span>{totalLikes}</span>
        </button>

        <button
          onClick={() => setReplyingToCommentId(comment._id)}
          className="flex items-center gap-1.5 text-xs font-extrabold text-slate-400 hover:text-slate-550 dark:hover:text-slate-255 transition-colors cursor-pointer"
        >
          <MessageSquare size={13} />
          Reply
        </button>

        {canDelete && (
          <button
            onClick={() => onDeleteComment(comment._id)}
            className="flex items-center gap-1.5 text-xs font-extrabold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
            title="Delete Comment"
          >
            <Trash2 size={13} />
            Delete
          </button>
        )}
      </div>

      {/* Inline reply interface */}
      {replyingToCommentId === comment._id && (
        <div className="mt-3.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 p-4 rounded-xl">
          <ReplyForm
            authorName={comment.author?.name || ""}
            onCancel={() => setReplyingToCommentId(null)}
            onSubmit={async (content, pics, vids) => {
              await onSubmitReply(content, comment._id, pics, vids);
            }}
            loading={commentSubmitLoading}
          />
        </div>
      )}

      {/* Recursively Render Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {comment.replies.map(reply => (
            <CommentNode
              key={reply._id}
              comment={reply}
              depth={depth + 1}
              replyingToCommentId={replyingToCommentId}
              setReplyingToCommentId={setReplyingToCommentId}
              handleLikeComment={handleLikeComment}
              onSubmitReply={onSubmitReply}
              commentSubmitLoading={commentSubmitLoading}
              appUser={appUser}
              formatDate={formatDate}
              getInitials={getInitials}
              onDeleteComment={onDeleteComment}
              postAuthorId={postAuthorId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
