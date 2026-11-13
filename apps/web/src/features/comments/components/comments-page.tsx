"use client";

import { Card } from "antd";
import { CreateCommentModal } from "./comment-form";
import { CommentTable } from "./comment-table";

export function CommentsPage() {
  return (
    <>
      <Card className="flex min-h-0 flex-1 flex-col" classNames={{ body: "flex min-h-0 flex-1 flex-col" }}>
        <CommentTable />
      </Card>
      <CreateCommentModal />
    </>
  );
}
