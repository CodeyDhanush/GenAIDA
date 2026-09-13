import { db } from "./index.ts";
import { users, otpVerifications } from "./schema.ts";
import { eq, and, gt, desc } from "drizzle-orm";

export interface CreateUserInput {
  name: string;
  dob: string;
  email: string;
  phone: string;
  password: string;
  organization?: string;
}

// 1. Find user by email
export async function findUserByEmail(email: string) {
  try {
    const records = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    return records[0] || null;
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw new Error("Database query failed while searching for user email", { cause: error });
  }
}

// 2. Find user by phone
export async function findUserByPhone(phone: string) {
  try {
    const cleanPhone = phone.trim();
    const records = await db
      .select()
      .from(users)
      .where(eq(users.phone, cleanPhone))
      .limit(1);
    return records[0] || null;
  } catch (error) {
    console.error("Error finding user by phone:", error);
    throw new Error("Database query failed while searching for user phone", { cause: error });
  }
}

// 3. Find user by UID
export async function findUserByUid(uid: string) {
  try {
    const records = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);
    return records[0] || null;
  } catch (error) {
    console.error("Error finding user by uid:", error);
    throw new Error("Database query failed while searching for user uid", { cause: error });
  }
}

// 4. Create user record
export async function createUser(data: CreateUserInput) {
  try {
    const uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const inserted = await db
      .insert(users)
      .values({
        uid,
        name: data.name.trim(),
        dob: data.dob.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        password: data.password,
        organization: data.organization ? data.organization.trim() : null,
        emailVerified: true,
        phoneVerified: true,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("Database query failed while registering new user", { cause: error });
  }
}

// 5. Store OTP verification code
export async function storeOtp(target: string, targetType: "email" | "phone", code: string) {
  try {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity
    const inserted = await db
      .insert(otpVerifications)
      .values({
        target: target.trim().toLowerCase(),
        targetType,
        code,
        verified: false,
        expiresAt,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error("Error storing OTP:", error);
    throw new Error("Database query failed while saving verification code", { cause: error });
  }
}

// 6. Verify OTP code
export async function verifyOtpCode(target: string, targetType: "email" | "phone", code: string) {
  try {
    const normalizedTarget = target.trim().toLowerCase();
    const now = new Date();

    const records = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.target, normalizedTarget),
          eq(otpVerifications.targetType, targetType),
          eq(otpVerifications.code, code.trim()),
          gt(otpVerifications.expiresAt, now)
        )
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    if (records.length === 0) {
      return false;
    }

    // Mark as verified
    await db
      .update(otpVerifications)
      .set({ verified: true })
      .where(eq(otpVerifications.id, records[0].id));

    return true;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw new Error("Database query failed while validating verification code", { cause: error });
  }
}

// 7. Check if target was verified recently
export async function isTargetVerified(target: string, targetType: "email" | "phone") {
  try {
    const normalizedTarget = target.trim().toLowerCase();
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    const records = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.target, normalizedTarget),
          eq(otpVerifications.targetType, targetType),
          eq(otpVerifications.verified, true),
          gt(otpVerifications.createdAt, fifteenMinsAgo)
        )
      )
      .limit(1);

    return records.length > 0;
  } catch (error) {
    console.error("Error checking verification status:", error);
    return false;
  }
}
