"use client";

import { Card } from "antd";
import { CommentDetailModal } from "./comment-detail-modal";
import { CreateCommentModal } from "./comment-form";
import { CommentTable } from "./comment-table";
import { ReviewCommentModal } from "./review-comment-modal";

export function CommentsPage() {
  return (
    <>
      <Card className="flex min-h-0 flex-1 flex-col" classNames={{ body: "flex min-h-0 flex-1 flex-col" }}>
        <CommentTable />
      </Card>
      <CreateCommentModal />
      <CommentDetailModal />
      <ReviewCommentModal />
    </>
  );
}
