const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.production.local' }); const workerEnv = require('dotenv').config({ path: 'workers/whatsapp/.env' }).parsed;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'coimbatorestartupcommunity@gmail.com',
    pass: process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASSWORD,
  },
  tls: { minVersion: 'TLSv1.2' },
});

const supabase = createClient(
  (workerEnv && workerEnv.SUPABASE_URL) || process.env.NEXT_PUBLIC_SUPABASE_URL,
  (workerEnv && workerEnv.SUPABASE_SERVICE_ROLE_KEY) || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Connecting to database...');
  const [profilesRes, membershipsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, whatsapp, consent'),
    supabase.from('memberships').select('user_id, member_number, status').eq('status', 'active')
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (membershipsRes.error) throw membershipsRes.error;

  const activeMemberships = membershipsRes.data || [];
  const claimedUserIds = new Set(activeMemberships.map(m => m.user_id));
  const membershipMap = new Map(activeMemberships.map(m => [m.user_id, m.member_number]));

  const profiles = profilesRes.data || [];
  const claimedMembers = profiles.filter(p => claimedUserIds.has(p.id) && p.email);
  const unclaimedMembers = profiles.filter(p => !claimedUserIds.has(p.id) && p.email);

  console.log(`Found ${claimedMembers.length} claimed members and ${unclaimedMembers.length} unclaimed members.`);

  // 1. Send verification emails to 68 claimed members
  console.log('\n--- Dispatched Phase 1: Phone Verification Notices (68 Claimed Members) ---');
  let claimedCount = 0;
  for (const member of claimedMembers) {
    const memberNum = membershipMap.get(member.id) || 'CSC Member';
    const name = member.full_name || 'Founder & Builder';
    
    const mailOptions = {
      from: 'CSC Circle <coimbatorestartupcommunity@gmail.com>',
      to: member.email,
      subject: 'Action Required: Verify Your WhatsApp Number — CSC Circle Digital ID Pass',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="margin-bottom: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 16px;">
            <h1 style="color: #0f172a; font-size: 22px; margin: 0;">Coimbatore Startup Community</h1>
            <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">CSC Circle — Official Member Portal</p>
          </div>

          <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>

          <p style="font-size: 15px; line-height: 1.6;">
            Congratulations on securing your Official CSC Membership ID (<strong>${memberNum}</strong>)!
          </p>

          <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #1e3a8a;">📱 Immediate Action: Mobile Number Verification</p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #475569;">
              To ensure secure authentication, real-time WhatsApp ecosystem alerts, and official meetup check-ins, please complete a one-time OTP verification of your mobile number.
            </p>
          </div>

          <p style="font-size: 15px; line-height: 1.6;">
            You can verify your number seamlessly right now by visiting your Profile Settings:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://csc.logicintelligencetechnologies.in/profile/settings" 
               style="background: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 600; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
              Verify Mobile Number Now →
            </a>
          </div>

          <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
            Once verified, your Digital Pass will be fully unlocked and ready for our upcoming community meetups.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            Coimbatore Startup Community (CSC) • Connect. Build. Grow.<br />
            https://csc.logicintelligencetechnologies.in
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      claimedCount++;
      process.stdout.write(`.` );
      // Non-blocking spacing
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`\nFailed sending to ${member.email}:`, err.message);
    }
  }
  console.log(`\nSuccessfully sent ${claimedCount}/${claimedMembers.length} verification emails to claimed members.`);

  // 2. Send Membership Claim invitations to 67 registered members
  console.log('\n--- Dispatched Phase 2: Membership ID Claim Invitations (67 Registered Members) ---');
  let unclaimedCount = 0;
  for (const member of unclaimedMembers) {
    const name = member.full_name || 'Founder & Builder';

    const mailOptions = {
      from: 'CSC Circle <coimbatorestartupcommunity@gmail.com>',
      to: member.email,
      subject: 'Claim Your Official CSC Membership ID & Digital Pass — CSC Circle',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="margin-bottom: 24px; border-bottom: 2px solid #10b981; padding-bottom: 16px;">
            <h1 style="color: #0f172a; font-size: 22px; margin: 0;">Coimbatore Startup Community</h1>
            <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">CSC Circle — Ecosystem Membership</p>
          </div>

          <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>

          <p style="font-size: 15px; line-height: 1.6;">
            Thank you for registering on <strong>CSC Circle</strong>! We noticed you haven't claimed your official <strong>CSC Membership ID</strong> yet.
          </p>

          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #065f46;">🚀 What you unlock with your Membership ID:</p>
            <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 14px; color: #374151; line-height: 1.6;">
              <li>Official CSC Digital Member Pass with secure QR check-in</li>
              <li>Exclusive bi-weekly meetup and networking access</li>
              <li>Priority access to mentors, startup grants & founder directory</li>
              <li>Instant 5-minute automated verification approval</li>
            </ul>
          </div>

          <p style="font-size: 15px; line-height: 1.6;">
            Claiming takes less than 60 seconds — simply log in and hit <strong>Claim Membership</strong>:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://csc.logicintelligencetechnologies.in/member/claim" 
               style="background: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: 600; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
              Claim Your Membership ID Now →
            </a>
          </div>

          <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
            Join over 68+ active founders and innovators in Coimbatore who have already claimed their official ID pass.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            Coimbatore Startup Community (CSC) • Connect. Build. Grow.<br />
            https://csc.logicintelligencetechnologies.in
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      unclaimedCount++;
      process.stdout.write(`.` );
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`\nFailed sending to ${member.email}:`, err.message);
    }
  }
  console.log(`\nSuccessfully sent ${unclaimedCount}/${unclaimedMembers.length} claim invitation emails to registered members.`);
}

main().catch(console.error);
