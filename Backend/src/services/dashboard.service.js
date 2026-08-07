const { listCvsByClientId } = require("./cv.service");

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function displayNameFromUser(user) {
  const fullName = String(user?.fullName || "").trim();
  if (fullName) return fullName;
  const email = String(user?.email || "").trim();
  if (email.includes("@")) return email.split("@")[0];
  return "there";
}

function accountLabelFromUser(user) {
  const role = String(user?.role || "user").toLowerCase();
  if (role === "admin") return "Admin Account";
  return "Free Account";
}

function formatRelativeTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function computeProfileScore(cvs) {
  if (!cvs.length) {
    return {
      score: 0,
      maxScore: 100,
      hint: "Create your first CV to start building your profile score.",
      ctaLabel: "Create New CV",
      ctaHref: "/my-cvs/ai-cv-builder/new",
    };
  }

  const avg =
    cvs.reduce((sum, cv) => sum + Number(cv.strengthPercent || 0), 0) / cvs.length;
  const score = Math.round(avg);

  let hint = "Keep updating your CVs to improve your profile score.";
  if (score < 50) {
    hint = "Add more experience, skills, and education details to reach 70%.";
  } else if (score < 80) {
    hint = "Strengthen impact statements and keywords to reach 90%.";
  } else {
    hint = "Great profile strength. Optimize for a target job to go further.";
  }

  return {
    score,
    maxScore: 100,
    hint,
    ctaLabel: score < 80 ? "Improve CVs" : "Update Profile",
    ctaHref: score < 80 ? "/my-cvs" : "/settings",
  };
}

function buildAiInsight(cvs) {
  if (!cvs.length) {
    return {
      title: "AI Insights",
      body: "You don't have any CVs yet. Create one and AI insights will appear here.",
      suggestionLabel: "Suggestion:",
      suggestionText: "Start with the AI CV Builder to generate your first resume.",
      metrics: [
        { id: "strength", label: "Strength", value: "0%", progressPercent: 0 },
        { id: "keywords", label: "Keywords", value: "0/0" },
        { id: "top-match", label: "Top Match", value: "—" },
      ],
      ctaLabel: "Create New CV",
      ctaHref: "/my-cvs/ai-cv-builder/new",
      relatedCvId: null,
    };
  }

  const topCv = [...cvs].sort(
    (a, b) => Number(b.strengthPercent || 0) - Number(a.strengthPercent || 0)
  )[0];
  const strength = Math.round(Number(topCv.strengthPercent || 0));
  const skills = Array.isArray(topCv.data?.skills) ? topCv.data.skills : [];
  const keywordHit = Math.min(skills.length, 15);
  const industry =
    String(topCv.data?.workExperience?.[0]?.company || "").trim() || "General";

  return {
    title: "AI Insights",
    body: `Our AI analyzed your "${topCv.displayTitle}" resume. Current strength is ${strength}%.`,
    suggestionLabel: "Suggestion:",
    suggestionText:
      strength < 85
        ? `Strengthen impact statements in "${topCv.displayTitle}" to boost visibility.`
        : `Run AI optimization on "${topCv.displayTitle}" for a target role.`,
    metrics: [
      {
        id: "strength",
        label: "Strength",
        value: `${strength}%`,
        progressPercent: strength,
      },
      {
        id: "keywords",
        label: "Keywords",
        value: `${keywordHit}/15`,
      },
      {
        id: "top-match",
        label: "Top Match",
        value: industry,
      },
    ],
    ctaLabel: "Apply AI Optimization",
    ctaHref: "/company-based-cv-editor",
    relatedCvId: topCv.id,
  };
}

function buildActivity(cvs) {
  if (!cvs.length) {
    return [
      {
        id: "empty-create",
        title: "No recent CV activity",
        detail: "Create your first CV to see activity here.",
        iconKey: "autoAwesome",
        iconFilled: true,
        actions: ["visibility"],
        href: "/my-cvs/ai-cv-builder/new",
        relatedCvId: null,
      },
    ];
  }

  return cvs.slice(0, 5).map((cv) => ({
    id: cv.id,
    title: cv.displayTitle,
    detail: `Last edited ${formatRelativeTime(cv.updatedAt)}`,
    iconKey: "description",
    iconFilled: false,
    actions: ["edit", "download"],
    href: `/my-cvs/ai-cv-builder/edit/${cv.id}`,
    relatedCvId: cv.id,
  }));
}

function buildVisibilityBars(cvs) {
  const now = new Date();
  const counts = Array.from({ length: 7 }, () => 0);

  for (const cv of cvs) {
    const updatedAt = new Date(cv.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) continue;
    const diffDays = Math.floor((now.getTime() - updatedAt.getTime()) / 86400000);
    if (diffDays < 0 || diffDays > 6) continue;
    const indexFromOldest = 6 - diffDays;
    counts[indexFromOldest] += 1;
  }

  const max = Math.max(...counts, 1);

  return counts.map((count, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - index));
    const heightPercent = Math.max(12, Math.round((count / max) * 100));
    return {
      id: `day-${index}`,
      dayLabel: DAY_LABELS[day.getDay()],
      heightPercent,
      highlighted: count === max && count > 0,
    };
  });
}

function buildEmptyRecommendation() {
  return {
    title: "AI Recommendation",
    body: "Create a CV to receive personalized keyword and role recommendations.",
    ctaLabel: "Create CV",
    ctaHref: "/my-cvs/ai-cv-builder/new",
    relatedCvId: "",
  };
}

function buildRecommendation(cvs) {
  if (!cvs.length) {
    return buildEmptyRecommendation();
  }

  const weakest = [...cvs].sort(
    (a, b) => Number(a.strengthPercent || 0) - Number(b.strengthPercent || 0)
  )[0];
  const skillsCount = Array.isArray(weakest.data?.skills)
    ? weakest.data.skills.length
    : 0;
  const missing = Math.max(0, 8 - skillsCount);

  return {
    title: "AI Recommendation",
    body:
      missing > 0
        ? `Your '${weakest.displayTitle}' CV could use ${missing} more role keywords to improve match rate.`
        : `Your '${weakest.displayTitle}' CV looks solid. Optimize it for a specific job posting next.`,
    ctaLabel: "Fix Now",
    ctaHref: `/company-based-cv-editor?cvId=${weakest.id}`,
    relatedCvId: weakest.id,
  };
}

async function getDashboardPayload(user) {
  const cvs = await listCvsByClientId(user.clientId);
  const name = displayNameFromUser(user);
  const activeCount = cvs.length;

  return {
    user: {
      id: user.id,
      name,
      email: user.email,
      clientId: user.clientId,
      accountLabel: accountLabelFromUser(user),
      avatarUrl: "",
      role: user.role,
    },
    welcome: {
      greeting: `Welcome back, ${name}!`,
      subtitle:
        activeCount > 0
          ? "Your career progress is looking sharp today. Ready for the next leap?"
          : "Create your first CV and let AI help you stand out.",
      stats: [
        {
          id: "cvs-created",
          label: "CVs Created",
          value: `${activeCount} Active CV${activeCount === 1 ? "" : "s"}`,
          iconKey: "description",
        },
      ],
    },
    aiInsight: buildAiInsight(cvs),
    profileScore: computeProfileScore(cvs),
    activity: buildActivity(cvs),
    insights: {
      visibility: buildVisibilityBars(cvs),
      recommendation: buildRecommendation(cvs),
    },
  };
}

module.exports = {
  getDashboardPayload,
};
