import { NextRequest, NextResponse } from "next/server";
import { User } from "@/src/models/user.models";
import { connect } from "@/src/lib/dbConfig";
import { hashedPassword } from "@/src/lib/hash";
import { signJWT } from "@/src/lib/jwt";
import nodemailer from "nodemailer";


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});


/* ── Gmail only ── */
function isGmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email.trim().toLowerCase());
}

/* ── Welcome email ── */
async function sendWelcomeEmail(email: string, username: string) {
  await transporter.sendMail({
    from: `"CodePulse" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Welcome to CodePulse 🔍",
html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Logo header -->
        <tr>
          <td align="center" style="padding:36px 40px 28px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#0a0a0a;border-radius:8px;padding:8px 14px;display:inline-block;">
                  <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:-0.3px;font-family:monospace;">
                    &#9674; CodePulse
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="height:1px;background:#f0f0f0;"></td></tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 20px;font-size:16px;color:#111;">
              Welcome to CodePulse, <strong>${username}</strong> 🎉
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7;">
              Your account is ready. Start scanning any public GitHub repo for exposed secrets, API keys, and get AI-powered code review in seconds.
            </p>

            <!-- Steps -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#333;">
                  <span style="font-weight:600;color:#111;">1.</span>
                  &nbsp; Paste any public GitHub repo URL
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#333;">
                  <span style="font-weight:600;color:#111;">2.</span>
                  &nbsp; Secret scanner runs across all files instantly
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#333;">
                  <span style="font-weight:600;color:#111;">3.</span>
                  &nbsp; Get AI code review with quality scores &amp; fix suggestions
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#0a0a0a;border-radius:8px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
                    style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.2px;font-family:monospace;">
                    Start scanning →
                  </a>
                </td>
              </tr>
            </table>

            <!-- GitHub repo link -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:8px;">
                  <img 
                  src="https://cdn-icons-png.flaticon.com/512/25/25231.png"  
                  width="18" 
                  height="18" 
                  style="display:block;"
                  alt="GitHub"
                />
                </td>
                <td style="vertical-align:middle;">
                  <a href="https://github.com/Gauravkumar512/Codepulse"
                    style="font-size:13px;color:#555;text-decoration:none;font-family:monospace;">
                    github.com/Gauravkumar512/Codepulse
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0f0f0;background:#fafafa;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
              You received this because you created an account at CodePulse.<br/>
              If this wasn't you, you can safely ignore this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
` ,
  });
}

export async function POST(request: NextRequest) {
  try {
    await connect();

    const { username, email, password, confirmPassword } = await request.json();

    if (!username || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Fields can't be empty" },
        { status: 400 }
      );
    }

    /* ── Gmail check ── */
    if (!isGmail(email)) {
      return NextResponse.json(
        { error: "Only Gmail addresses are allowed (@gmail.com)" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Both passwords should match" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username or Email already exists" },
        { status: 409 }
      );
    }

    const hashPass = await hashedPassword(password);
    const savedUser = await new User({ username, email, password: hashPass }).save();

    const token = await signJWT({ id: savedUser._id.toString(), email: savedUser.email });

    /* ── Send welcome email (non-blocking — don't fail signup if email fails) ── */
    sendWelcomeEmail(email, username).catch((err) =>
      console.error("Welcome email failed:", err)
    );

    const response = NextResponse.json(
      { message: "Account created successfully", success: true },
      { status: 201 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}