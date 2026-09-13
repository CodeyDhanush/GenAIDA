import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  name: text("name").notNull(),
  dob: text("dob").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: boolean("email_verified").default(true).notNull(),
  phoneVerified: boolean("phone_verified").default(true).notNull(),
  organization: text("organization"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  target: text("target").notNull(),
  targetType: text("target_type").notNull(), // 'email' | 'phone'
  code: text("code").notNull(),
  verified: boolean("verified").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
