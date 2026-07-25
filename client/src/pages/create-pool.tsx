import { useEffect, useState, useRef } from "react";
import { uploadFile } from "@/lib/upload";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Gift, Plane, ShoppingBag, Calendar, ImagePlus, RefreshCw, Loader2, Sparkles, PartyPopper, Home, GraduationCap, Heart, Coffee, Shield, AlertTriangle, Upload, X, Wand2, LinkIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link, useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

const POOL_EMOJIS = [
  '🎂', '🎉', '✈️', '🏖️', '🎁', '🛒', '🏠', '🎓',
  '💍', '🚗', '🏕️', '🎯', '🏢', '🔁', '💰', '🍕',
  '🎮', '⚽', '🎵', '📱', '🐶', '🌴', '🎄', '❤️',
  '🥳', '🍽️', '🎬', '🧳', '💐', '🎊', '🏆', '🌟',
];

const categoryGradients: Record<string, string> = {
  gift: "from-pink-500/10 to-rose-500/5",
  trip: "from-blue-500/10 to-cyan-500/5",
  recurring: "from-emerald-500/10 to-green-500/5",
  purchase: "from-amber-500/10 to-yellow-500/5",
  event: "from-violet-500/10 to-purple-500/5",
  other: "from-gray-500/10 to-slate-500/5",
};

const categoryIcons: Record<string, React.ElementType> = {
  gift: Gift,
  trip: Plane,
  purchase: ShoppingBag,
  event: Calendar,
  other: Sparkles,
  recurring: RefreshCw,
};

export default function CreatePool() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: securityStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["securityStatus"],
    queryFn: api.security.getStatus,
    enabled: isAuthenticated,
  });
  
  const isKycVerified = securityStatus?.kycVerified;
  
  const params = new URLSearchParams(search);
  const prefillTitle = params.get('title') || "";
  const prefillAmount = params.get('amount') || "";
  const prefillDescription = params.get('description') || "";
  const prefillParticipants = params.get('participants') || "";
  
  const [title, setTitle] = useState(prefillTitle);
  const [category, setCategory] = useState("");
  const [targetAmount, setTargetAmount] = useState(prefillAmount);
  const [description, setDescription] = useState(prefillDescription || (prefillParticipants ? `Split between ${prefillParticipants} people` : ""));
  const [deadline, setDeadline] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("monthly");
  const [coverImage, setCoverImage] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [emoji, setEmoji] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      return await uploadFile(file);
    },
    onSuccess: (objectPath) => {
      setCoverImage(objectPath);
      setShowImageDialog(false);
      toast({ description: "Image uploaded successfully" });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to upload image", variant: "destructive" });
    },
    onSettled: () => {
      setIsUploadingImage(false);
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ description: "Image must be under 5MB", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({ description: "Please select an image file", variant: "destructive" });
        return;
      }
      setIsUploadingImage(true);
      uploadImageMutation.mutate(file);
    }
  };

  const getStockImages = () => {
    const images: Record<string, string[]> = {
      trip: [
        "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=200&fit=crop",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=200&fit=crop",
        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=200&fit=crop",
      ],
      gift: [
        "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&h=200&fit=crop",
        "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=200&fit=crop",
        "https://images.unsplash.com/photo-1512909006721-3d6018887383?w=400&h=200&fit=crop",
      ],
      purchase: [
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop",
        "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=200&fit=crop",
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=200&fit=crop",
      ],
      event: [
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=200&fit=crop",
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop",
        "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=200&fit=crop",
      ],
      recurring: [
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop",
        "https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=400&h=200&fit=crop",
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=200&fit=crop",
      ],
    };
    return images[category] || images.gift;
  };

  const createPoolMutation = useMutation({
    mutationFn: (data: any) => api.pools.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pools });
      toast({
        title: "Pool Created!",
        description: "Your pool is ready. Invite friends to chip in.",
      });
      setLocation(`/pool/${data.pool.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create pool",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }
  
  if (statusLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({ description: "Please enter a pool name", variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ description: "Please select a category", variant: "destructive" });
      return;
    }
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      toast({ description: "Please enter a valid target amount", variant: "destructive" });
      return;
    }
    if (!deadline) {
      toast({ description: "Please set a deadline", variant: "destructive" });
      return;
    }
    
    const categoryMap: Record<string, string> = {
      gift: "Gift",
      trip: "Trip",
      purchase: "Purchase",
      recurring: "Recurring",
      event: "Event",
      other: "Other",
    };

    const payload: any = {
      title,
      category: categoryMap[category] || "Other",
      targetAmount,
      description,
      deadline: new Date(deadline).toISOString(),
      isRecurring,
      frequency: isRecurring ? frequency : null,
      image: coverImage || null,
    };
    if (emoji) payload.emoji = emoji;
    if (externalLink.trim()) payload.externalLink = externalLink.trim();

    createPoolMutation.mutate(payload);
  };

  const templates = [
    { icon: PartyPopper, label: "Birthday Gift", category: "gift", amount: "100", desc: "Chip in for a birthday present" },
    { icon: Plane, label: "Group Trip", category: "trip", amount: "500", desc: "Pool funds for travel expenses" },
    { icon: Home, label: "Housewarming", category: "gift", amount: "200", desc: "Welcome gift for a new home" },
    { icon: GraduationCap, label: "Graduation", category: "gift", amount: "150", desc: "Celebrate a graduate" },
    { icon: Heart, label: "Wedding Gift", category: "gift", amount: "300", desc: "Gift for the newlyweds" },
    { icon: Coffee, label: "Office Fund", category: "recurring", amount: "50", desc: "Monthly office snacks/coffee" },
    { icon: RefreshCw, label: "Rent Split", category: "recurring", amount: "1000", desc: "Monthly rent contributions" },
    { icon: RefreshCw, label: "Utilities", category: "recurring", amount: "150", desc: "Monthly utility bills" },
    { icon: RefreshCw, label: "Subscription", category: "recurring", amount: "30", desc: "Shared streaming/service" },
  ];

  const SelectedCategoryIcon = category ? categoryIcons[category] : null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 md:mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        {!isKycVerified && !statusLoading && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/8 to-amber-500/5 px-4 py-3 text-sm" data-testid="banner-kyc-notice">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div>
              <p className="font-medium text-orange-300">Identity Verification Required</p>
              <p className="text-orange-300/70 mt-0.5">
                Complete KYC verification in{" "}
                <Link href="/security" className="underline font-medium text-orange-400 hover:text-orange-300 transition-colors">Security settings</Link>{" "}
                for full features.
              </p>
            </div>
          </div>
        )}
        
        <div className="mb-8 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">Create a New Pool</h1>
          <p className="text-sm md:text-base text-muted-foreground">Set up a pool to split costs for a gift, trip, or purchase.</p>
        </div>

        <div className="mb-10">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Quick Templates
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {templates.map((template) => {
              const isActive = activeTemplate === template.label;
              const gradient = categoryGradients[template.category] || categoryGradients.other;
              return (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => {
                    setActiveTemplate(template.label);
                    setCategory(template.category);
                    setTargetAmount(template.amount);
                    setDescription(template.desc);
                    setIsRecurring(template.category === "recurring");
                    const defaultDeadline = new Date();
                    defaultDeadline.setDate(defaultDeadline.getDate() + 30);
                    setDeadline(defaultDeadline.toISOString().split('T')[0]);
                  }}
                  className={`p-3 md:p-4 rounded-xl border bg-gradient-to-br ${gradient} transition-all duration-200 text-left group hover:scale-[1.02] ${
                    isActive
                      ? "ring-2 ring-primary border-primary/50 shadow-md shadow-primary/10"
                      : "border-white/10 hover:border-primary/40 hover:shadow-sm"
                  }`}
                  data-testid={`template-${template.label.toLowerCase().replace(' ', '-')}`}
                >
                  <template.icon className={`w-6 h-6 transition-colors mb-2 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                  <div className="font-medium text-sm">{template.label}</div>
                  <div className="text-xs text-muted-foreground">${template.amount}</div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 md:space-y-10">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-1 rounded-full bg-primary" />
              <h2 className="font-semibold text-base">Pool Details</h2>
            </div>

            <div className="space-y-4">
              <Label htmlFor="title" className="text-base">What are you pooling for?</Label>
              <Input 
                id="title" 
                placeholder="e.g. Sarah's Birthday, Bali Trip, Office Coffee Machine" 
                className="h-12 text-lg bg-white/5 border-white/10 focus:border-primary/50" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required 
                data-testid="input-pool-title"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select required value={category} onValueChange={(val) => { setCategory(val); setIsRecurring(val === 'recurring'); setActiveTemplate(null); }}>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10" data-testid="select-category">
                    <div className="flex items-center gap-2">
                      {SelectedCategoryIcon && <SelectedCategoryIcon className="w-4 h-4 text-primary shrink-0" />}
                      <SelectValue placeholder="Select category" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gift"><div className="flex items-center gap-2"><Gift className="w-4 h-4" /> Gift</div></SelectItem>
                    <SelectItem value="trip"><div className="flex items-center gap-2"><Plane className="w-4 h-4" /> Trip</div></SelectItem>
                    <SelectItem value="purchase"><div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Purchase</div></SelectItem>
                    <SelectItem value="event"><div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Event</div></SelectItem>
                    <SelectItem value="other"><div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Other</div></SelectItem>
                    <SelectItem value="recurring"><div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" /> Recurring / Bill</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Target Amount</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-base select-none">$</div>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="0.00" 
                    className="h-12 bg-white/5 border-white/10 font-mono pl-8" 
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    required 
                    data-testid="input-target-amount"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pool Icon</Label>
              <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full h-12 px-4 rounded-md bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
                    data-testid="button-emoji-picker"
                  >
                    <span className="text-2xl">{emoji || '💰'}</span>
                    <span className="text-sm text-muted-foreground flex-1">
                      {emoji ? 'Tap to change' : 'Choose an emoji (default: 💰)'}
                    </span>
                    {emoji && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEmoji(""); }}
                        className="p-1 rounded-full hover:bg-white/10 transition-colors"
                        data-testid="button-clear-emoji"
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[340px] p-3" align="start">
                  <div className="mb-2 text-sm font-medium">Choose Pool Icon</div>
                  <div className="grid grid-cols-8 gap-1">
                    {POOL_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { setEmoji(e); setEmojiPickerOpen(false); }}
                        className={`w-9 h-9 flex items-center justify-center rounded-md text-lg hover:bg-white/10 transition-colors ${emoji === e ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
                        data-testid={`button-emoji-${e}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {isRecurring && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2">
                <h3 className="font-semibold text-sm mb-3 text-primary flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Recurring Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select defaultValue="monthly" onValueChange={setFrequency}>
                      <SelectTrigger className="bg-background border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Repeat Until</Label>
                    <Select defaultValue="cancel">
                      <SelectTrigger className="bg-background border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cancel">I cancel it</SelectItem>
                        <SelectItem value="date">Specific Date</SelectItem>
                        <SelectItem value="amount">Target Reached</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                placeholder="Tell people what this is for..." 
                className="min-h-[100px] bg-white/5 border-white/10 resize-none" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="input-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalLink">External Link (Optional)</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <Input
                  id="externalLink"
                  type="url"
                  placeholder="https://example.com"
                  className="h-12 bg-white/5 border-white/10 pl-10"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  data-testid="input-external-link"
                />
              </div>
              <p className="text-xs text-muted-foreground ml-1">Add a link to a wishlist, event page, or related website</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-1 rounded-full bg-primary" />
              <h2 className="font-semibold text-base">Schedule & Media</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Deadline</Label>
                <div className="relative">
                  <Input 
                    type="date" 
                    className="h-12 bg-white/5 border-white/10 pl-10" 
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required 
                    data-testid="input-deadline"
                  />
                  <Calendar className="w-4 h-4 absolute left-3 top-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cover Image</Label>
                {coverImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-white/10">
                    <img 
                      src={coverImage} 
                      alt="Pool cover" 
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&h=200&fit=crop";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setCoverImage("")}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                      data-testid="button-remove-cover"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
                    <DialogTrigger asChild>
                      <div 
                        className="h-24 border border-dashed border-white/20 rounded-md flex flex-col items-center justify-center text-sm text-muted-foreground hover:bg-white/5 cursor-pointer transition-colors"
                        data-testid="button-add-cover"
                      >
                        <ImagePlus className="w-6 h-6 mb-2" />
                        <span>Upload or Choose Image</span>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Cover Image</DialogTitle>
                        <DialogDescription>Upload an image or paste a link to use as your pool's cover.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            data-testid="input-cover-image"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingImage}
                            data-testid="button-upload-cover"
                          >
                            {isUploadingImage ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload from Device
                              </>
                            )}
                          </Button>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-3">Or choose a stock image:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {getStockImages().map((img, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setCoverImage(img);
                                  setShowImageDialog(false);
                                }}
                                className="aspect-video rounded-md overflow-hidden border-2 border-transparent hover:border-primary transition-colors focus:outline-none focus:border-primary"
                                data-testid={`button-stock-image-${idx}`}
                              >
                                <img src={img} alt={`Stock ${idx + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-2">
            <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setLocation("/")}>Cancel</Button>
            <Button 
              type="submit" 
              size="lg" 
              className="w-full sm:w-auto font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200" 
              disabled={createPoolMutation.isPending}
              data-testid="button-create-pool"
            >
              {createPoolMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Pool...</> : "Create Pool"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
