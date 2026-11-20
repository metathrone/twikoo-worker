/**
 * 原生 Fetch 版 Akismet 客户端（适用于 Cloudflare Workers / Edge 运行时）
 */
export class EdgeAkismetClient {
  private key: string;
  private blog: string;

  constructor(options: { key: string; blog: string }) {
    this.key = options.key;
    this.blog = options.blog;
  }

  async verifyKey(): Promise<boolean> {
    try {
      const res = await fetch("https://rest.akismet.com/1.1/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          key: this.key,
          blog: this.blog,
        }),
      });
      const text = await res.text();
      return text.trim() === "valid";
    } catch {
      return false;
    }
  }

  async checkSpam(comment: Record<string, unknown>): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        blog: this.blog,
        user_ip: String(comment.user_ip || ""),
        user_agent: String(comment.user_agent || ""),
        referrer: String(comment.referrer || ""),
        permalink: String(comment.permalink || ""),
        comment_type: String(comment.comment_type || "comment"),
        comment_author: String(comment.comment_author || ""),
        comment_author_email: String(comment.comment_author_email || ""),
        comment_author_url: String(comment.comment_author_url || ""),
        comment_content: String(comment.comment_content || ""),
      });
      const res = await fetch(`https://${this.key}.rest.akismet.com/1.1/comment-check`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const text = await res.text();
      return text.trim() === "true";
    } catch {
      return false;
    }
  }
}
