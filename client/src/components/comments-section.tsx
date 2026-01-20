import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ThumbsUp, MessageSquare, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface CommentsSectionProps {
  comments: any[];
  poolId: string;
}

export function CommentsSection({ comments: initialComments, poolId }: CommentsSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const createCommentMutation = useMutation({
    mutationFn: (text: string) => api.comments.create(poolId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pool(poolId) });
      setNewComment("");
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.comments.like(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pool(poolId) });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment);
  };

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-white/5">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-xl">Discussion</h3>
        <span className="text-sm text-muted-foreground">({initialComments.length})</span>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 flex gap-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={user?.avatar || undefined} />
          <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <Textarea 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment or ask a question..." 
            className="bg-white/5 border-white/10 min-h-[80px] pr-12 resize-none" 
            data-testid="input-comment"
          />
          <Button 
            size="icon" 
            type="submit" 
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full"
            disabled={!newComment.trim() || createCommentMutation.isPending}
            data-testid="button-submit-comment"
          >
            {createCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>

      <div className="space-y-6">
        {initialComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Start the discussion!</p>
        ) : (
          initialComments.map((comment: any) => (
            <div key={comment.id} className="flex gap-4 animate-in fade-in slide-in-from-top-2">
              <Avatar className="w-10 h-10 mt-1">
                <AvatarImage src={comment.user?.avatar} />
                <AvatarFallback>{comment.user?.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{comment.user?.name || 'Anonymous'}</span>
                    {comment.user?.badges?.map((b: any) => (
                      <span key={b.id} title={b.name} className="text-xs cursor-help">{b.icon}</span>
                    ))}
                    <span className="text-xs text-muted-foreground">• {formatTime(comment.timestamp)}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{comment.text}</p>
                <button 
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
                  onClick={() => likeCommentMutation.mutate(comment.id)}
                >
                  <ThumbsUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>{comment.likes || 0} likes</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
