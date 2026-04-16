import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { connect } from "@/src/lib/dbConfig";
import { User } from "@/src/models/user.models";
import { sendWelcomeEmail } from "@/src/lib/email";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      try {
        await connect();

        let dbUser = await User.findOne({ email: user.email }).lean<{ _id: any; username: string }>() ;

        if (!dbUser) {
          const username = user.name || user.email.split("@")[0];

          const created = await new User({
            username,
            email: user.email,
            password: null,
          }).save();

          sendWelcomeEmail(user.email, username).catch((err) =>
            console.error("Welcome email failed:", err)
          );

          (user as any).mongoId = created._id.toString();
          (user as any).dbUsername = created.username;
        } else {
          (user as any).mongoId = dbUser._id.toString();
          (user as any).dbUsername = dbUser.username;
        }

        return true;
      } catch (error) {
        console.error("OAuth signIn callback error:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user && (user as any).mongoId) {
        token.mongoId = (user as any).mongoId;
        token.dbUsername = (user as any).dbUsername;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.mongoId) {
        (session as any).mongoId = token.mongoId as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
};
