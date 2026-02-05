"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  revieweeId: string;
  onSubmit: (payload: { rating: number; comment: string; revieweeId: string }) => Promise<void>;
}

export default function ReviewModal({ open, title = "Write a review", onClose, onSubmit, revieweeId }: Props) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setRating(5);
      setComment("");
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-card p-6 rounded shadow-lg pointer-events-auto">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>

        <div className="mb-3">
          <label className="block mb-1 text-sm">Rating</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                className={`px-2 py-1 rounded cursor-pointer ${s <= rating ? 'bg-yellow-400 text-black' : 'bg-white/5'}`}
                aria-label={`Rate ${s}`}
              >
                {s}★
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-1 text-sm">Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-2 bg-input rounded text-sm"
            rows={4}
            placeholder="Share your experience"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={async () => {
              if (rating < 1 || rating > 5) return;
              if (!comment.trim()) {
                alert('Please write a comment');
                return;
              }
              if (!revieweeId) {
                alert('revieweeId is required');
                return;
              }
              setSubmitting(true);
              try {
                await onSubmit({ rating, comment: comment.trim(), revieweeId });
                onClose();
              } catch (e) {
                console.error('Review submit error', e);
                alert('Failed to submit review');
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </div>
    </div>
  );
}
