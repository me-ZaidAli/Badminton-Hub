import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { format } from "date-fns";

interface ReviewUser {
  id: number;
  fullName: string;
  email: string;
}

interface ReviewItem {
  id: number;
  userId: number;
  targetType: string;
  targetId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: ReviewUser;
}

interface ReviewsResponse {
  reviews: ReviewItem[];
  averageRating: number;
  reviewCount: number;
}

interface ReviewSectionProps {
  targetType: "COACH" | "CLUB";
  targetId: number;
}

function StarRating({
  rating,
  interactive = false,
  onRate,
  size = "sm",
}: {
  rating: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <div className="flex items-center gap-0.5" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating
              ? "text-yellow-500 fill-yellow-500"
              : "text-muted-foreground"
          } ${interactive ? "cursor-pointer" : ""}`}
          onClick={interactive && onRate ? () => onRate(star) : undefined}
          data-testid={`star-${star}`}
        />
      ))}
    </div>
  );
}

export default function ReviewSection({ targetType, targetId }: ReviewSectionProps) {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const {
    data,
    isLoading,
  } = useQuery<ReviewsResponse>({
    queryKey: ["/api/reviews", targetType, targetId],
  });

  const userReview = data?.reviews.find((r) => r.userId === user?.id);

  useEffect(() => {
    if (userReview) {
      setRating(userReview.rating);
      setComment(userReview.comment || "");
    }
  }, [userReview]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/reviews", {
        targetType,
        targetId,
        rating,
        comment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", targetType, targetId] });
      toast({
        title: userReview ? "Review updated" : "Review submitted",
        description: "Your review has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest("DELETE", `/api/reviews/${reviewId}`);
    },
    onSuccess: () => {
      setRating(0);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", targetType, targetId] });
      toast({
        title: "Review deleted",
        description: "Your review has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6" data-testid="reviews-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  const reviews = data?.reviews || [];
  const averageRating = data?.averageRating || 0;
  const reviewCount = data?.reviewCount || 0;

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-6" data-testid="review-section">
      <Card className="p-6">
        <div className="flex items-center gap-3 flex-wrap">
          <StarRating rating={Math.round(averageRating)} size="md" />
          <span className="text-lg font-semibold" data-testid="text-average-rating">
            {averageRating.toFixed(1)}
          </span>
          <span className="text-muted-foreground" data-testid="text-review-count">
            ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
          </span>
        </div>
      </Card>

      {user && (
        <Card className="p-6" data-testid="review-form">
          <h3 className="text-lg font-semibold mb-4">
            {userReview ? "Edit Your Review" : "Write a Review"}
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Your rating</p>
              <StarRating
                rating={rating}
                interactive
                onRate={setRating}
                size="md"
              />
            </div>
            <Textarea
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              data-testid="input-review-comment"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={rating === 0 || submitMutation.isPending}
                data-testid="button-submit-review"
              >
                {submitMutation.isPending
                  ? "Saving..."
                  : userReview
                    ? "Update Review"
                    : "Submit Review"}
              </Button>
              {userReview && (
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(userReview.id)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-review"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Review"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4" data-testid="reviews-list">
        {reviews.length === 0 ? (
          <Card className="p-6">
            <p className="text-muted-foreground text-center" data-testid="text-no-reviews">
              No reviews yet. Be the first to leave a review!
            </p>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="p-4" data-testid={`review-item-${review.id}`}>
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>{getInitials(review.user.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium" data-testid={`text-reviewer-name-${review.id}`}>
                      {review.user.fullName}
                    </span>
                    <span className="text-sm text-muted-foreground" data-testid={`text-review-date-${review.id}`}>
                      {format(new Date(review.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="mt-1">
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm" data-testid={`text-review-comment-${review.id}`}>
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
