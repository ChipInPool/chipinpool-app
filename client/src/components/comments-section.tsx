import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, ThumbsUp, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Comment, CURRENT_USER } from "@/lib/mock-data";

interface CommentsSectionProps {
  comments: Comment[];
  poolId: string;
}

export function CommentsSection({ comments: initialComments, poolId }: CommentsSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `c_${Date.now()}`,
      userId: CURRENT_USER.id,
      user: CURRENT_USER,
      text: newComment,
      timestamp: 'Just now',
      likes: 0
    };

    setComments([comment, ...comments]);
    setNewComment("");
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-white/5">
      <div className="flex items-center gap-2 mb-6">
         <MessageSquare className="w-5 h-5 text-primary" />
         <h3 className="font-display font-bold text-xl">Discussion</h3>
         <span className="text-sm text-muted-foreground">({comments.length})</span>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 flex gap-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={CURRENT_USER.avatar} />
          <AvatarFallback>ME</AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
           <Textarea 
             value={newComment}
             onChange={(e) => setNewComment(e.target.value)}
             placeholder="Add a comment or ask a question..." 
             className="bg-white/5 border-white/10 min-h-[80px] pr-12 resize-none" 
           />
           <Button 
             size="icon" 
             type="submit" 
             className="absolute bottom-3 right-3 h-8 w-8 rounded-full"
             disabled={!newComment.trim()}
           >
             <Send className="w-4 h-4" />
           </Button>
        </div>
      </form>

      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 animate-in fade-in slide-in-from-top-2">
            <Avatar className="w-10 h-10 mt-1">
              <AvatarImage src={comment.user.avatar} />
              <AvatarFallback>{comment.user.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <span className="font-semibold text-sm">{comment.user.name}</span>
                     {comment.user.badges?.map(b => (
                        <span key={b.id} title={b.name} className="text-xs cursor-help">{b.icon}</span>
                     ))}
                     <span className="text-xs text-muted-foreground">• {comment.timestamp}</span>
                  </div>
               </div>
               <p className="text-sm text-muted-foreground leading-relaxed">{comment.text}</p>
               <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group">
                  <ThumbsUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>{comment.likes} likes</span>
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
