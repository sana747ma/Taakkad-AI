const SAMPLES = {
  bank: "عاجل جداً: تم إيقاف بطاقتك البنكية مؤقتاً بسبب محاولة دخول مشبوهة. يرجى تحديث بياناتك وإدخال رمز التحقق OTP فوراً عبر الرابط التالي: http://secure-bank-update-login.xyz",
  fakeSite: "http://adpolice-fines-pay-verify.top/login?session=urgent",
  delivery: "إشعار شحنة: تعذر توصيل طردك رقم #AE8841 لعدم اكتمال العنوان. ادفع رسوم إعادة التوصيل (3.50 درهم) خلال ساعتين عبر الرابط المختصر: https://bit.ly/track-parcel-fee",
  safe: "مرحباً بك، نذكرك بموعد مراجعتك في العيادة غداً الساعة 10:00 صباحاً. للاستفسار يمكنك الاتصال بالرقم الرسمي المعتمد للعيادة أو زيارة موقعهم الرسمي."
};

const SCAM_KEYWORDS = [
  { word: "otp", weight: 28, reason: "يطلب رمز التحقق لمرة واحدة (OTP) الذي يُستخدم لاختراق الحسابات." },
  { word: "رمز التحقق", weight: 28, reason: "يطلب رمز التحقق السري أو المؤقت." },
  { word: "بطاقتك", weight: 20, reason: "يركز على البطاقة البنكية أو بيانات الدفع." },
  { word: "تحديث بيانات", weight: 22, reason: "يطلب إعادة إدخال أو تحديث بيانات حساسة." },
  { word: "إيقاف", weight: 18, reason: "يستخدم تهديداً بإيقاف الحساب أو الخدمة لإثارة القلق." },
  { word: "عاجل", weight: 15, reason: "يفرض استعجالاً غير طبيعي لدفع الضحية للتصرف دون تفكير." },
  { word: "جائزة", weight: 22, reason: "يعد بجوائز أو مبالغ غير متوقعة لاستدراج الضحية." },
  { word: "ربحت", weight: 22, reason: "يستخدم إغراء الفوز أو الربح السريع." },
  { word: "رسوم", weight: 20, reason: "يطلب دفع رسوم صغيرة (مثل رسوم شحن أو تخليص) لسرقة بيانات البطاقة." },
  { word: "شحنة", weight: 14, reason: "يستغل سيناريو توصيل الطرود الشائع في رسائل الاحتيال." },
  { word: "طرد", weight: 14, reason: "يستغل سيناريو الطرود والرسائل النصية الاحتيالية." }
];

const SUSPICIOUS_DOMAINS = [".xyz", ".top", ".click", ".gq", ".tk", ".ml", ".cf", "bit.ly", "tinyurl.com", "t.co"];
const SPOOF_TARGETS = ["bank", "login", "verify", "update", "fines", "adpolice", "police", "gov", "pay"];

function loadSample(type) {
  const input = document.getElementById("messageInput");
  if (input && SAMPLES[type]) {
    input.value = SAMPLES[type];
    analyzeContent();
  }
}

function clearAll() {
  const input = document.getElementById("messageInput");
  const resultSection = document.getElementById("resultSection");
  const piiBox = document.getElementById("piiBox");
  if (input) input.value = "";
  if (resultSection) resultSection.classList.add("hidden");
  if (piiBox) piiBox.classList.add("hidden");
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {}
}

function maskSensitiveData(text) {
  let maskedCount = 0;

  const maskedText = text
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, () => {
      maskedCount++;
      return "[بطاقة_مخفية]";
    })
    .replace(/(?:\+?\d{1,3}[\s-]?)?\(?0?\d{2,3}\)?[\s-]?\d{3}[\s-]?\d{4}/g, (match) => {
      if (match.replace(/\D/g, "").length >= 8) {
        maskedCount++;
        return "[رقم_مخفي]";
      }
      return match;
    });

  return { maskedText, maskedCount };
}

function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:com|net|org|ae|xyz|top|click|ly|co)[^\s]*)/gi;
  return text.match(urlRegex) || [];
}

function analyzeContent() {
  const inputEl = document.getElementById("messageInput");
  const rawText = inputEl ? inputEl.value.trim() : "";
  if (!rawText) {
    alert("يرجى لصق رابط أو رسالة أو اختيار أحد الأمثلة الجاهزة أولاً.");
    return;
  }

  const { maskedText, maskedCount } = maskSensitiveData(rawText);
  const lowerText = maskedText.toLowerCase();

  let score = 0;
  const reasons = [];
  const advice = [];

  SCAM_KEYWORDS.forEach((item) => {
    if (lowerText.includes(item.word.toLowerCase())) {
      score += item.weight;
      reasons.push(item.reason);
    }
  });

  const urls = extractUrls(maskedText);
  if (urls.length > 0) {
    urls.forEach((url) => {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.startsWith("http://")) {
        score += 20;
        reasons.push(`الرابط (${url}) يستخدم بروتوكول HTTP غير المشفر.`);
      }
      const hasSuspiciousDomain = SUSPICIOUS_DOMAINS.some((domain) => lowerUrl.includes(domain));
      if (hasSuspiciousDomain) {
        score += 25;
        reasons.push(`الرابط (${url}) يستخدم امتداداً أو خدمة اختصار شائعة في المواقع والروابط الوهمية.`);
      }
      const hasSpoofPattern = SPOOF_TARGETS.some((term) => lowerUrl.includes(term));
      if (hasSpoofPattern && !lowerUrl.includes(".gov.ae")) {
        score += 22;
        reasons.push(`الرابط (${url}) يحتوي على كلمات توحي بجهة رسمية أو صفحة دخول/دفع خارج النطاق الرسمي المعتمد.`);
      } else if (!hasSuspiciousDomain && !lowerUrl.startsWith("http://")) {
        score += 8;
        reasons.push(`تم رصد رابط (${url}) — يُنصح بالتحقق من نطاقه الرسمي قبل فتحه.`);
      }
    });
  }

  score = Math.min(100, Math.max(5, score));

  const resultSection = document.getElementById("resultSection");
  const statusBadge = document.getElementById("statusBadge");
  const riskScoreText = document.getElementById("riskScoreText");
  const riskBarFill = document.getElementById("riskBarFill");
  const reasonsList = document.getElementById("reasonsList");
  const adviceList = document.getElementById("adviceList");
  const piiBox = document.getElementById("piiBox");

  if (!resultSection || !statusBadge || !riskScoreText || !riskBarFill || !reasonsList || !adviceList) {
    return;
  }

  resultSection.classList.remove("hidden");
  riskScoreText.textContent = `${score}%`;
  riskBarFill.style.width = `${score}%`;

  statusBadge.classList.remove("status-safe", "status-warn", "status-danger");

  if (score >= 65) {
    statusBadge.textContent = "🚨 رابط أو محتوى احتيالي / خطورة عالية";
    statusBadge.classList.add("status-danger");
    riskBarFill.style.backgroundColor = "#b91c1c";

    advice.push("لا تفتح الرابط ولا تُدخل أي بيانات شخصية أو بنكية أو كلمات مرور في الموقع.");
    advice.push("لا تشارك رمز التحقق (OTP) أو تدفع أي رسوم عبر روابط غير موثوقة.");
    advice.push("احظر المرسل وبلّغ عن الرابط الوهمي عبر القنوات الرسمية مثل خدمة أمان بشرطة أبوظبي.");
  } else if (score >= 30) {
    statusBadge.textContent = "⚠️ رابط أو محتوى مشبوه — تعامل بحذر";
    statusBadge.classList.add("status-warn");
    riskBarFill.style.backgroundColor = "#d97706";

    advice.push("تحقق من عنوان الموقع الرسمي مباشرة عبر المتصفح بدلاً من الاعتماد على الرابط المرسل.");
    advice.push("تجنب إتمام أي دفع أو إدخال بيانات حساسة في صفحات غير معروفة.");
  } else {
    score = Math.min(score, 15);
    riskScoreText.textContent = `${score}%`;
    riskBarFill.style.width = `${score}%`;
    statusBadge.textContent = "✅ تبدو آمنة مبدئياً";
    statusBadge.classList.add("status-safe");
    riskBarFill.style.backgroundColor = "#15803d";

    if (reasons.length === 0) {
      reasons.push("لم يتم رصد مؤشرات قوية لرابط وهمي أو كلمات احتيال شائعة في النص.");
    }
    advice.push("رغم أن المؤشرات تبدو مطمئنة، ابقَ حذراً ولا تشارك بياناتك السرية عبر الروابط أو الرسائل.");
  }

  reasonsList.innerHTML = reasons.map((r) => `<li>${r}</li>`).join("");
  adviceList.innerHTML = advice.map((a) => `<li>${a}</li>`).join("");

  if (piiBox) {
    if (maskedCount > 0) {
      piiBox.classList.remove("hidden");
      piiBox.textContent = `🔒 تم إخفاء (${maskedCount}) من البيانات الرقمية/الحساسة تلقائياً قبل عرض التحليل لحماية خصوصيتك.`;
    } else {
      piiBox.classList.add("hidden");
    }
  }

  resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function speakResult() {
  try {
    if (!("speechSynthesis" in window)) {
      alert("متصفحك لا يدعم القراءة الصوتية حالياً.");
      return;
    }

    window.speechSynthesis.cancel();

    const badgeEl = document.getElementById("statusBadge");
    const statusText = badgeEl ? badgeEl.textContent : "";
    let shortMessage = "";

    if (statusText.includes("خطورة عالية") || statusText.includes("احتيالي")) {
      shortMessage =
        "تنبيه مهم: هذا الرابط أو المحتوى خطير جداً وقد يكون احتيالاً. لا تفتح الرابط ولا تشارك رمز التحقق أو بياناتك البنكية، وتواصل مع الجهات الرسمية.";
    } else if (statusText.includes("مشبوه")) {
      shortMessage =
        "انتبه: هذا الرابط أو المحتوى مشبوه. لا تدخل بياناتك ولا تدفع أي رسوم، وتأكد من الموقع الرسمي أولاً.";
    } else {
      shortMessage =
        "النتيجة: هذا المحتوى يبدو آمناً مبدئياً، لكن ابقَ حذراً ولا تعطي بياناتك السرية لأحد.";
    }

    const utterance = new SpeechSynthesisUtterance(shortMessage);
    utterance.lang = "ar-SA";
    utterance.rate = 0.9;

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 80);
  } catch (err) {
    console.warn("Speech error:", err);
  }
}