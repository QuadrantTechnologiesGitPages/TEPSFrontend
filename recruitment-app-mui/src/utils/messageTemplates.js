export const generateMessage = (type, candidate) => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  if (type === 'referrer') {
    return `Dear ${candidate.referredBy},

I hope this email finds you well!

I wanted to provide you with an update on ${candidate.name}'s application status.

Current Status: ${candidate.currentStatus}
${candidate.lastDiscussion}

We are actively working on finding suitable opportunities that match their profile. Their expertise in ${candidate.skills.slice(0, 3).join(', ')} makes them a strong candidate for several positions we're currently exploring.

Key Highlights:
• Experience: ${candidate.yearsExp}
• Visa Status: ${candidate.visa}
• Location: ${candidate.location}
• Specialization: ${candidate.vertical}

${candidate.discussionDetails}

Next Steps: ${candidate.nextFollowup || 'We will continue to actively search for matching opportunities'}

I truly appreciate your referral and the trust you've placed in us. Rest assured, we're committed to finding the best opportunity for ${candidate.name}.

I'll keep you posted on any significant developments. If you have any questions or additional insights about ${candidate.name}'s preferences or strengths, please don't hesitate to reach out.

Thank you for your continued support!

Best regards,
[Your Name]
[Your Title]
[Your Contact Information]`;
  } else {
    return `Dear ${candidate.name},

I hope this message finds you doing well!

I came across your profile and was impressed by your experience in ${candidate.skills.slice(0, 3).join(', ')}. Your background aligns perfectly with some exciting opportunities we're currently working on.

Based on your profile:
• ${candidate.yearsExp} of experience in ${candidate.vertical}
• Strong expertise in ${candidate.skills.slice(0, 4).join(', ')}
• ${candidate.visa} visa status
• Currently ${candidate.currentStatus.toLowerCase()}

We have several positions that match your skillset and experience level. These opportunities offer:
• Competitive compensation packages
• Growth opportunities in your field of expertise
• Work with cutting-edge technologies
• Excellent work-life balance

${candidate.engagement === 'Full Time' ? 'These are full-time positions with excellent benefits.' : 'We have both contract and full-time opportunities available.'}

I would love to discuss these opportunities with you in more detail and understand your career goals better. Would you be available for a brief call this week? I'm flexible with timing and can work around your schedule.

Please let me know what works best for you, and feel free to share any updated resume or specific preferences you might have.

Looking forward to connecting with you soon!

Best regards,
[Your Name]
[Your Title]
[Your Contact Information]

P.S. ${candidate.referredBy} spoke highly of your skills and professionalism, which is why I'm particularly excited about potentially working with you!`;
  }
};