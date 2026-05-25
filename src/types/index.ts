import { Timestamp, FieldValue } from "firebase/firestore";

export type UserRole = "viewer" | "writer" | "editor" | "admin";
export type PostStatus = "draft" | "pending" | "published" | "rejected";

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  featuredImage: string;
  status: PostStatus;
  stats: { views: number; likes: number; comments: number };
  createdAt: Timestamp | FieldValue | Date;
  updatedAt: Timestamp | FieldValue | Date;
  publishedAt?: Timestamp | FieldValue | Date | null;
  submittedAt?: Timestamp | FieldValue | Date | null;
  rejectedAt?: Timestamp | FieldValue | Date | null;
  rejectionReason?: string;
}

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  createdAt: Timestamp | Date;
  isActive: boolean;
  profile: { bio: string; avatar: string };
  stats: { postsCount: number; publishedCount: number };
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  postId?: string;
  read: boolean;
  createdAt: Timestamp | Date;
}
