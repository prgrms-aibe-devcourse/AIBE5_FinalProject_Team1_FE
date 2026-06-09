export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
};

export type ApiErrorResponse = ApiResponse<never> & {
  success: false;
  code?: string;
  message: string;
};

export type ISODateTime = string;
export type Role = "owner" | "admin" | "editor" | "viewer";
export type ChannelType = "general" | "repository" | "custom";
export type ReactionTargetType = "thread" | "thread_reply";

