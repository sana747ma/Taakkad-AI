(() => {
  const STORAGE_KEY_CALLS = "taakkad_ai_caller_reports_v1";

  const PRESETS = {
    bank: "عزيزي العميل، تم تجميد بطاقتك البنكية مؤقتاً. يرجى تأكيد بياناتك وإرسال رمز OTP فوراً عبر http://uae-bank-secure-check.xyz",
    gov: "إشعار عاجل من وزارة/جهة حكومية: يوجد تحديث إلزامي للهوية وسداد رسوم عبر http://uae-gov-pay-portal.top قبل إيقاف خدماتك.",
    delivery: "شركة الشحن: تعذّر تسليم طردك اليوم. أعد جدولة التوصيل ودفع رسوم بسيطة خلال ساعتين عبر https://bit.ly/track-parcel-ae",
    safe: "مرحباً، نذكّرك بموعد مراجعتك غداً الساعة 10:00 صباحاً. يمكنك الاستفسار عبر الرقم الرسمي المعتمد لعيادتنا."
  };

  const SCENARIOS = [
    {
      title: "السيناريو 1: رسالة «تحديث الهوية أو الحساب» المستعجلة",
      context: "وصلتك رسالة نصية تفيد بوجود مخالفة أو إيقاف حساب وتطلب منك الضغط على رابط خارجي وإدخال بياناتك خلال 15 دقيقة.",
      options: [
        {
          text: "أضغط على الرابط فوراً وأدخل بياناتي لأتجنب الإيقاف",
          safe: false,
          explain: "المحتالون يستغلون عامل الخوف والاستعجال لدفعك نحو صفحة مزيفة تسرق بياناتك. التحقق يكون دائماً من التطبيق أو الموقع الرسمي المعتمد (.gov.ae)."
        },
        {
          text: "أتجاهل الرابط وأتحقق من التطبيق أو الموقع الرسمي بنفسي",
          safe: true,
          explain: "تصرف سليم! عدم الضغط على الروابط المجهولة والرجوع للقناة الرسمية مباشرة يقطع الطريق على صفحات التصيد."
        }
      ]
    },
    {
      title: "السيناريو 2: اتصال يطلب رمز التحقق (OTP)",
      context: "اتصل شخص عرّف نفسه بأنه من خدمة العملاء وطلب منك قراءة رمز التحقق المكوّن من 6 أرقام الذي وصلك للتو.",
      options: [
        {
          text: "أعطيه الرمز لأنه هو من أرسل طلب التحقق",
          safe: false,
          explain: "رمز التحقق (OTP) خط أحمر؛ مشاركته تمنح المحتال صلاحية الدخول إلى حسابك أو تنفيذ عمليات باسمك."
        },
        {
          text: "أرفض إعطاء الرمز وأنهي المكالمة وأتصل بالجهة من رقمها الرسمي",
          safe: true,
          explain: "ممتاز! لا يُطلب رمز التحقق (OTP) لتأكيد الهوية عبر مكالمة واردة."
        }
      ]
    },
    {
      title: "السيناريو 3: عرض استثمار أو ربح سريع بمقابل مبدئي",
      context: "حساب غير معروف يعرض عليك ربحاً مضموناً وسريعاً بشرط تحويل مبلغ صغير مسبقاً كرسوم فتح محفظة أو تخليص.",
      options: [
        {
          text: "أحوّل مبلغاً صغيراً كتجربة لأرى إن كان حقيقياً",
          safe: false,
          explain: "طلبات التحويل المسبق أو «الرسوم التجريبية» من مصادر غير موثوقة هي من أكثر أساليب الاحتيال شيوعاً."
        },
        {
          text: "أرفض العرض وأحظر الحساب وأبلّغ عنه",
          safe: true,
          explain: "تصرف ذكي! العوائد السريعة «المضمونة» والضغط لتحويل أموال مسبقة مؤشر خطر واضح."
        }
      ]
    }
  ];

  const DEFAULT_REPORTS = [
    {
      number: "+44 7700 900123",
      behavior: "ادعى أنه جهة أمنية/حكومية وطلب تحديث الهوية أو غرامة",
      risk: "مرتفعة",
      notes: "مكالمة دولية تدّعي صفة رسمية وتطلب بيانات شخصية."
    },
    {
      number: "050-XXX-4821",
      behavior: "طلب رمز التحقق (OTP) أو كلمة مرور أو CVV",
      risk: "مرتفعة",
      notes: "محاولة الحصول على رمز OTP أثناء ادعاء تحديث الحساب."
    }
  ];

  // عناصر الواجهة
  const seniorModeBtn = document.getElementById("seniorModeBtn");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  const messageInput = document.getElementById("messageInput");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const clearScanBtn = document.getElementById("clearScanBtn");
  const scanResultCard = document.getElementById("scanResultCard");
  const riskBadge = document.getElementById("riskBadge");
  const riskTitle = document.getElementById("riskTitle");
  const riskScore = document.getElementById("riskScore");
  const riskSummary = document.getElementById("riskSummary");
  const maskedPreview = document.getElementById("maskedPreview");
  const reasonsList = document.getElementById("reasonsList");
  const educationTip = document.getElementById("educationTip");
  const speakScanBtn = document.getElementById("speakScanBtn");
  const whatsappShareBtn = document.getElementById("whatsappShareBtn");
  const copyAlertBtn = document.getElementById("copyAlertBtn");
  const familyAlertBox = document.getElementById("familyAlertBox");
  const familyAlertText = document.getElementById("familyAlertText");
  const waDirectLink = document.getElementById("waDirectLink");

  const phoneInput = document.getElementById("phoneInput");
  const callBehaviorSelect = document.getElementById("callBehaviorSelect");
  const callNotesInput = document.getElementById("callNotesInput");
  const checkCallerBtn = document.getElementById("checkCallerBtn");
  const reportCallerBtn = document.getElementById("reportCallerBtn");
  const callerResultBox = document.getElementById("callerResultBox");
  const callerBadge = document.getElementById("callerBadge");
  const callerScoreText = document.getElementById("callerScoreText");
  const callerVerdict = document.getElementById("callerVerdict");
  const callerFindings = document.getElementById("callerFindings");
  const speakCallerBtn = document.getElementById("speakCallerBtn");
  const callerReportsList = document.getElementById("callerReportsList");
  const reportsCountPill = document.getElementById("reportsCountPill");

  const immunityScoreEl = document.getElementById("immunityScore");
  const scenarioContainer = document.getElementById("scenarioContainer");
  const scenarioFeedback = document.getElementById("scenarioFeedback");
  const feedbackTitle = document.getElementById("feedbackTitle");
  const feedbackText = document.getElementById("feedbackText");
  const nextScenarioBtn = document.getElementById("nextScenarioBtn");

  let lastSpokenText = "مرحب بك في تطبيق تأكّد AI لحماية بياناتك.";
  let lastCallerSpeech = "تحقق من هوية المتصل ولا تشارك رمز التحقق أبداً.";
  let scenarioIndex = 0;
  let immunityPoints = 0;

  // التبديل بين التبويبات
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;
      tabButtons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      tabPanels.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });

  // وضع كبار السن
  seniorModeBtn.addEventListener("click", () => {
    const enabled = document.body.classList.toggle("senior-mode");
    seniorModeBtn.setAttribute("aria-pressed", String(enabled));
    seniorModeBtn.textContent = enabled ? "👴 وضع كبار السن: مفعل" : "👴 وضع كبار السن: مغلق";
  });

  // قراءة صوتية عربية مبسطة
  function speakArabic(text) {
    if (!("speechSynthesis" in window)) {
      alert("المتصفح لا يدعم القراءة الصوتية المباشرة، يمكنك قراءة النص الظاهر بوضوح.");
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar-AE";
    utter.rate = document.body.classList.contains("senior-mode") ? 0.85 : 0.98;
    window.speechSynthesis.speak(utter);
  }

  // تعمية البيانات الحساسة محلياً
  function maskSensitiveData(text) {
    return text
      .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[رقم بطاقة مخفي]")
      .replace(/\b784-\d{4}-\d{7}-\d\b/g, "[رقم هوية مخفي]")
      .replace(/(?:\+?\d{1,3}[\s-]?)?\(?0?\d{2,3}\)?[\s-]?\d{3}[\s-]?\d{4}/g, "[رقم هاتف مخفي]");
  }

  // تحليل الرسالة أو الرابط
  function analyzeMessage(rawText) {
    const text = rawText.trim();
    const lower = text.toLowerCase();
    let score = 0;
    const reasons = [];

    const urls = text.match(/https?:\/\/[^\s]+/gi) || [];
    if (urls.some((u) => u.toLowerCase().startsWith("http://"))) {
      score += 25;
      reasons.push("يحتوي على رابط غير مشفر (http://) مما يزيد احتمالية اعتراض البيانات.");
    }

    const suspiciousTlds = [".xyz", ".top", ".click", ".gq", ".tk", ".ml", ".ga", ".cf", ".rest"];
    const shorteners = ["bit.ly", "tinyurl.com", "t.co", "rb.gy", "cutt.ly"];
    urls.forEach((u) => {
      const uLower = u.toLowerCase();
      if (suspiciousTlds.some((tld) => uLower.includes(tld))) {
        score += 25;
        reasons.push(`الرابط يستخدم نطاقاً (${u}) شائعاً في الروابط المشبوهة أو غير المعتادة.`);
      }
      if (shorteners.some((s) => uLower.includes(s))) {
        score += 20;
        reasons.push("يحتوي على رابط مختصر يخفي الوجهة النهائية الحقيقية.");
      }
      if (!uLower.includes(".gov.ae") && (lower.includes("حكوم") || lower.includes("شرط") || lower.includes("هوي") || lower.includes("وزارة"))) {
        score += 25;
        reasons.push("يذكر جهة رسمية أو هوية دون استخدام نطاق حكومي إماراتي معتمد (.gov.ae).");
      }
    });

    const urgencyWords = ["عاجل", "فوراً", "خلال دقائق", "سيتم إيقاف", "تجميد", "آخر إنذار", "مخالفة", "urgent", "immediately", "suspended"];
    if (urgencyWords.some((w) => lower.includes(w))) {
      score += 20;
      reasons.push("يستخدم أسلوب الاستعجال أو التهديد لدفعك لاتخاذ قرار سريع دون تحقق.");
    }

    const credentialWords = ["otp", "رمز التحقق", "كلمة المرور", "الرقم السري", "cvv", "بطاقة", "تحديث البيانات", "سداد رسوم"];
    if (credentialWords.some((w) => lower.includes(w))) {
      score += 25;
      reasons.push("يطلب بيانات سرية أو رمز تحقق (OTP) أو دفع رسوم عبر رسالة/رابط.");
    }

    if (score > 100) score = 100;

    let level = "low";
    let label = "منخفضة الخطورة / يبدو آمناً مبدئياً";
    let title = "مؤشرات الخطر منخفضة";
    let summary = "لم تظهر مؤشرات تصيّد واضحة في النص المدخل، ومع ذلك يُنصح دائماً بالتحقق من المرسل عبر القنوات الرسمية.";
    let tip = "حتى في الرسائل العادية، تأكد من هوية المرسل ولا تشارك رموز التحقق أو البيانات البنكية عبر الروابط.";

    if (score >= 55) {
      level = "high";
      label = "عالية الخطورة / مؤشرات احتيال قوية";
      title = "تحذير: احتمالية احتيال مرتفعة";
      summary = "تظهر في الرسالة أو الرابط مؤشرات خطورة متعددة مرتبطة بالتصيد أو انتحال الصفة أو طلب بيانات حساسة.";
      tip = "لا تضغط على الرابط ولا ترسل أي رمز تحقق أو بيانات. تحقق من الجهة مباشرة عبر تطبيقها أو موقعها الرسمي المعتمد.";
    } else if (score >= 25) {
      level = "med";
      label = "متوسطة الخطورة / يحتاج تحققاً";
      title = "تنبيه: راجع التفاصيل قبل التفاعل";
      summary = "توجد بعض المؤشرات التي تستدعي الحذر والتحقق من مصدر الرسالة أو الرابط قبل المتابعة.";
      tip = "قارن اسم النطاق بعناية مع الموقع الرسمي المعروف، وتجنب إدخال بيانات الدخول من روابط غير موثوقة.";
    }

    if (reasons.length === 0) {
      reasons.push("لا توجد كلمات استعجال أو طلب بيانات سرية أو روابط مشبوهة ظاهرة في الفحص الأولي.");
    }

    return { score, level, label, title, summary, tip, reasons };
  }

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.preset;
      if (PRESETS[key]) {
        messageInput.value = PRESETS[key];
        runScan();
      }
    });
  });

  function runScan() {
    const raw = messageInput.value;
    if (!raw.trim()) {
      alert("يرجى إدخال رسالة أو رابط لفحصه أولاً.");
      return;
    }

    const masked = maskSensitiveData(raw.trim());
    const res = analyzeMessage(raw);

    scanResultCard.classList.remove("hidden");
    familyAlertBox.classList.add("hidden");

    riskBadge.className = "risk-badge " + (res.level === "high" ? "badge-high" : res.level === "med" ? "badge-med" : "badge-low");
    riskBadge.textContent = res.label;
    riskTitle.textContent = res.title;
    riskScore.textContent = `${res.score}%`;
    riskSummary.textContent = res.summary;
    maskedPreview.textContent = masked;
    educationTip.textContent = res.tip;

    reasonsList.innerHTML = "";
    res.reasons.forEach((r) => {
      const li = document.createElement("li");
      li.textContent = r;
      reasonsList.appendChild(li);
    });

    lastSpokenText = `${res.title}. نسبة الخطورة ${res.score} بالمئة. ${res.summary} ${res.tip}`;
  }

  analyzeBtn.addEventListener("click", runScan);

  clearScanBtn.addEventListener("click", () => {
    messageInput.value = "";
    scanResultCard.classList.add("hidden");
    familyAlertBox.classList.add("hidden");
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  });

  speakScanBtn.addEventListener("click", () => speakArabic(lastSpokenText));

  function buildFamilyAlertText() {
    const scoreStr = riskScore.textContent || "مرتفعة";
    const titleStr = riskTitle.textContent || "تنبيه أمني";
    const sample = maskSensitiveData(messageInput.value.trim()).slice(0, 140);
    return `تنبيه من (تأكّد AI): ${titleStr} (الخطورة: ${scoreStr}). يُرجى عدم الضغط على الروابط المشبوهة أو مشاركة رمز OTP. مثال: "${sample}"`;
  }

  whatsappShareBtn.addEventListener("click", () => {
    const alertMsg = buildFamilyAlertText();
    familyAlertText.value = alertMsg;
    waDirectLink.href = `https://wa.me/?text=${encodeURIComponent(alertMsg)}`;
    familyAlertBox.classList.remove("hidden");
  });

  copyAlertBtn.addEventListener("click", () => {
    const alertMsg = buildFamilyAlertText();
    navigator.clipboard?.writeText(alertMsg).then(() => {
      alert("تم نسخ بطاقة التحذير.");
    }).catch(() => {
      familyAlertText.value = alertMsg;
      familyAlertBox.classList.remove("hidden");
    });
  });

  // فحص الأرقام وسجل البلاغات المحلي
  function getSavedReports() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_CALLS) || "null");
      return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_REPORTS;
    } catch {
      return DEFAULT_REPORTS;
    }
  }

  function saveReports(list) {
    try {
      localStorage.setItem(STORAGE_KEY_CALLS, JSON.stringify(list));
    } catch {
      // تجاهل في حال عدم توفر التخزين
    }
  }

  function renderReports() {
    const list = getSavedReports();
    reportsCountPill.textContent = `${list.length} بلاغ`;
    callerReportsList.innerHTML = "";

    list.forEach((item) => {
      const div = document.createElement("div");
      div.className = "report-item";
      div.innerHTML = `
        <div>
          <strong>${escapeHtml(item.number)}</strong> — <span>${escapeHtml(item.behavior)}</span>
          <div class="muted">${escapeHtml(item.notes || "")}</div>
        </div>
        <span class="risk-badge badge-high">${escapeHtml(item.risk || "مرتفعة")}</span>
      `;
      callerReportsList.appendChild(div);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function evaluateCaller() {
    const num = phoneInput.value.trim();
    const behavior = callBehaviorSelect.value;
    const notes = callNotesInput.value.trim();

    if (!num && behavior === "normal_inquiry") {
      alert("أدخل الرقم أو اختر سلوك المكالمة للفحص.");
      return;
    }

    let score = 10;
    const findings = [];

    const cleanNum = num.replace(/\s+/g, "");
    const isInternational = cleanNum.startsWith("+") && !cleanNum.startsWith("+971");
    if (isInternational && (behavior === "id_update" || behavior === "otp" || behavior === "threat")) {
      score += 35;
      findings.push("رقم دولي خارج الإمارات يرتبط بادعاء صفة رسمية أو طلب بيانات حساسة.");
    } else if (isInternational) {
      score += 15;
      findings.push("الرقم يحمل رمز اتصال دولياً؛ تحقق من سبب الاتصال قبل التفاعل.");
    }

    if (behavior === "otp") {
      score += 55;
      findings.push("طلب رمز التحقق (OTP) أو بيانات البطاقة عبر مكالمة هو مؤشر احتيال واضح.");
    } else if (behavior === "id_update") {
      score += 50;
      findings.push("ادعاء تحديث الهوية أو مخالفة عبر مكالمة غير متوقعة يستدعي التحقق عبر القنوات الرسمية.");
    } else if (behavior === "threat") {
      score += 45;
      findings.push("استخدام التهديد بالإيقاف الفوري أسلوب شائع للضغط على المتصل به.");
    } else if (behavior === "prize_loan") {
      score += 35;
      findings.push("وعود الجوائز أو القروض السريعة المقرونة بطلب بيانات أو رسوم مؤشر خطر.");
    } else {
      findings.push("سلوك المكالمة لا يتضمن طلب بيانات سرية أو تهديداً مباشراً في المدخلات.");
    }

    const saved = getSavedReports();
    const matched = saved.find((r) => num && r.number.replace(/\s+/g, "") === cleanNum);
    if (matched) {
      score += 20;
      findings.push("هذا الرقم مسجل مسبقاً ضمن سجل البلاغات المحلية في المتصفح.");
    }

    if (notes) {
      findings.push(`ملاحظتك المسجلة: ${notes}`);
    }

    if (score > 100) score = 100;

    callerResultBox.classList.remove("hidden");
    let badgeClass = "badge-low";
    let badgeText = "منخفضة الخطورة";
    let verdict = "لا توجد مؤشرات خطورة عالية في المدخلات، مع ضرورة عدم مشاركة أي بيانات سرية.";

    if (score >= 55) {
      badgeClass = "badge-high";
      badgeText = "عالية الخطورة";
      verdict = "تحذير: توجد مؤشرات قوية على مكالمة احتيالية. أنهِ المكالمة ولا تشارك أي رمز أو بيانات.";
    } else if (score >= 25) {
      badgeClass = "badge-med";
      badgeText = "متوسطة الخطورة";
      verdict = "تنبيه: المكالمة تتطلب حذراً وتحققاً مستقلاً عبر الأرقام الرسمية المعتمدة.";
    }

    callerBadge.className = `risk-badge ${badgeClass}`;
    callerBadge.textContent = badgeText;
    callerScoreText.textContent = `مؤشر الخطورة: ${score}%`;
    callerVerdict.textContent = verdict;

    callerFindings.innerHTML = "";
    findings.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      callerFindings.appendChild(li);
    });

    lastCallerSpeech = `${badgeText}. ${verdict}`;
  }

  checkCallerBtn.addEventListener("click", evaluateCaller);

  reportCallerBtn.addEventListener("click", () => {
    const num = phoneInput.value.trim();
    if (!num) {
      alert("أدخل الرقم المراد تسجيل بلاغ عنه في السجل المحلي.");
      return;
    }
    const behaviorText = callBehaviorSelect.options[callBehaviorSelect.selectedIndex].text;
    const notesText = callNotesInput.value.trim() || "بلاغ مضاف من واجهة الفحص.";
    const current = getSavedReports();
    current.unshift({
      number: num,
      behavior: behaviorText,
      risk: "مرتفعة",
      notes: notesText
    });
    saveReports(current);
    renderReports();
    alert("تمت إضافة البلاغ إلى السجل المحلي.");
  });

  speakCallerBtn.addEventListener("click", () => speakArabic(lastCallerSpeech));

  // محاكي المناعة الرقمية
  function renderScenario() {
    const item = SCENARIOS[scenarioIndex % SCENARIOS.length];
    scenarioFeedback.classList.add("hidden");

    const optionsHtml = item.options
      .map(
        (opt, idx) =>
          `<button class="option-btn" type="button" data-opt-idx="${idx}">${escapeHtml(opt.text)}</button>`
      )
      .join("");

    scenarioContainer.innerHTML = `
      <h3>${escapeHtml(item.title)}</h3>
      <div class="scenario-message">${escapeHtml(item.context)}</div>
      <div class="options-grid">${optionsHtml}</div>
    `;

    scenarioContainer.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosen = item.options[Number(btn.dataset.optIdx)];
        scenarioContainer.querySelectorAll(".option-btn").forEach((b) => (b.disabled = true));
        scenarioFeedback.classList.remove("hidden");

        if (chosen.safe) {
          immunityPoints += 25;
          immunityScoreEl.textContent = String(immunityPoints);
          feedbackTitle.textContent = "✅ قرار آمن (+25 نقطة مناعة)";
        } else {
          feedbackTitle.textContent = "⚠️ وقعت في فخ المحاكاة — تعلّم السبب";
        }
        feedbackText.textContent = chosen.explain;
      });
    });
  }

  nextScenarioBtn.addEventListener("click", () => {
    scenarioIndex += 1;
    renderScenario();
  });

  // تهيئة أولية
  renderReports();
  renderScenario();
})();
