// Ballegho — Arabic / English strings
// Arabic is RTL, English is LTR.
// Add keys here as the app grows.

export type Lang = "ar" | "en";

export const strings = {
  en: {
    // Date / greeting
    greeting:    "As-salāmu ʿalaykum",
    greetingGold: "ʿalaykum",           // the gold-coloured word
    greetingBase: "As-salāmu ",         // the plain part before it

    // Hijri month names
    hijriMonths: [
      "Muḥarram", "Ṣafar", "Rabīʿ al-Awwal", "Rabīʿ al-Thānī",
      "Jumādā al-Ūlā", "Jumādā al-Ākhirah", "Rajab", "Shaʿbān",
      "Ramaḍān", "Shawwāl", "Dhū al-Qaʿdah", "Dhū al-Ḥijjah",
    ],

    // Weekdays
    weekdays: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    // Single-char day abbreviations for 7-day strip (index 0 = Sunday)
    weekdayLetters: ["S","M","T","W","T","F","S"],

    // Prayer names
    prayers: {
      fajr:    { name: "Fajr",    short: "Fajr" },
      dhuhr:   { name: "Dhuhr",   short: "Dhr"  },
      asr:     { name: "ʿAṣr",    short: "Asr"  },
      maghrib: { name: "Maghrib", short: "Mgr"  },
      isha:    { name: "ʿIshāʾ",  short: "Isha" },
    },
    nextPrayer: "Next",
    prayerNow:  "Now",
    locationNeeded: "Enable location for prayer times",

    // Tab labels
    tabToday:    "Today",
    tabSunnah:   "Sunnah",
    tabAdhkar:   "Adhkār",
    tabStreaks:  "Progress",
    tabLearn:    "Learn",
    tabProfile:  "Profile",

    // Welcome screen (shown to unauthenticated users)
    welcome: {
      begin:      "Begin your journey",
      haveAccount:"I already have an account",
    },

    // Prayer strip
    tapToRetry: "Tap to retry",

    // Home screen
    home: {
      noSunnahs:       "No active sunnahs yet",
      sunnahsToday:    "sunnahs today",
      dayStreak:       "day streak",
      // Maghrib day boundary
      dayResetsAt:     "Hijri day ends at Maghrib",
      newDayBegan:     "New Hijri day · fresh start",
      // Streak warning (shown ~90 min before Maghrib if anchor not done)
      streakSeal:      "Seal your streak before Maghrib",
      streakAnchor:    "Complete your anchor sunnah",
      minutesLeft:     "min left",
      // Anchor completion blessing ("بَارَكَ اللَّهُ فِيكَ · Day N")
      blessingDay:     "Day",
    },

    // Adaptive coach (Today screen — unlock / reduce / recover)
    coach: {
      unlockEyebrow:  "Unlocked",
      unlockTitle:    "You're ready for one more",
      unlockBody:     "You've been consistent, māshāʾAllāh. Choose one gentle sunnah to add to your day:",
      reduceEyebrow:  "Lighten the load",
      reduceTitle:    "Busy stretch?",
      reduceBody:     "Protect your streak — keep your anchor and pause a couple for now. You can pick them back up anytime.",
      reduceCta:      "Pause these for now",
      recoverEyebrow: "Welcome back",
      recoverTitle:   "Pick up where you left off",
      recoverBody:    "The chain isn't broken — it's been waiting for you. Restart with just your anchor and build from there.",
      recoverCta:     "Restart gently",
    },

    // Nūr (points)
    nur: {
      label:       "Nūr",
      balance:     "Balance",
      unlock:      "Unlock",
      unlockTitle: "Unlock this theme",
      notEnough:   "Not enough Nūr yet — keep going.",
      cancel:      "Cancel",
    },

    // First-Nūr explainer (one-time tip)
    nurTip: {
      title:     "You earned your first Nūr ✨",
      body:      "Nūr (نور — \"light\") grows as you stay consistent and convey the good. It's just encouragement to keep going — never a measure of your worship.",
      earnTitle: "Earn Nūr by",
      earnDo:    "Doing a sunnah",
      earnExtra: "Trying an extra one",
      earnShare: "Sharing a sunnah",
      spend:     "Spend it on beautiful share-card themes — more coming soon, in shāʾ Allāh.",
      cta:       "Let's go",
    },

    // Streaks / Progress tab
    streaks: {
      eyebrow:        "Your journey",
      title:          "Progress",
      currentStreak:  "Current streak",
      days:           "days",
      best:           "Best",
      thisMonth:      "Active days",
      total:          "Total",
      activity:       "Activity",
      last5Weeks:     "Last 5 weeks",
      milestones:     "Milestones",
      mostConsistent: "Most consistent",
      noData:         "Complete sunnahs to start building your streak.",
    },

    // Sunnah detail page
    sunnah: {
      hadithLabel:  "Hadith",
      aboutLabel:   "About this sunnah",
      statsLabel:   "Your stats",
      dayStreak:    "day streak",
      totalDone:    "total done",
      thisWeek:     "this week",
      bestStreak:   "Best streak",
      days:         "days",
      doneToday:    "Done for today ✓",
      markDone:     "Mark as done today",
      remove:       "Remove from my practice",
      cantRemove:   "Cannot remove",
      cantRemoveMsg:"This is your anchor sunnah. Change your anchor in Profile first.",
      confirmRemove:"Remove sunnah",
      confirmMsg:   "Remove from your practice?",
      cancel:       "Cancel",
      // Counter (sebha) interaction
      tapToCount:   "Tap to count",
      counterDone:  "Completed for today",
      reset:        "Reset",
      of:           "of",
      markNotDone:  "Mark as not done today",
      willUnlock:   "Ballegho adds new sunnahs for you as you stay consistent — keep going and this one may be unlocked soon.",
      didOnce:      "I did this once",
      didOnceDone:  "Done once today ✓",
      startSession: "Start session",
      continueSession: "Continue session",
      sessionDoneToday: "Today's session is complete ✓",
    },

    // Adhkār playlist player
    adhkar: {
      reward:       "Reward",
      upNext:       "Up next",
      allItems:     "All adhkār · tap any",
      of:           "of",
      times:        "×",
      complete:     "Session complete",
      completeSub:  "May Allah accept it from you.",
      backToAll:    "Done",
      empty:        "This session has no adhkār yet.",
      doneForToday: "Done for today",
      sealedPartial:"saved for today",
      keepGoing:    "Not yet — keep going",
    },

    // Milestone celebration card (shown when global streak hits 7 / 14 / 21 / 40 / 100)
    milestones: {
      eyebrow:  "Milestone",
      days:     "days in a row",
      dismiss:  "Alhamdulillāh",
      // 7 days
      m7head:   "7 days",
      m7body:   "The Prophet ﷺ said the most beloved deeds to Allah are those done consistently, even if few.",
      m7hadith: "أحبُّ الأعمالِ إلى اللهِ أدومُها وإن قلَّ",
      m7source: "Bukhārī & Muslim",
      // 14 days
      m14head:  "Two weeks",
      m14body:  "SubḥānAllāh — two weeks of consistency.",
      // 21 days
      m21head:  "21 days",
      m21body:  "Habits start to feel natural around now. Keep going.",
      // 40 days
      m40head:  "40 days",
      m40body:  "Whoever is consistent in a deed, it becomes a part of him.",
      // 100 days
      m100head: "100 days",
      m100body: "MāshāAllāh. You have made the Sunnah part of who you are.",
    },

    // Share card
    share: {
      button:       "Share",
      title:        "Share this Sunnah",
      shareImage:   "Share image",
      savePhoto:    "Save to photos",
      messagePh:    "Add a message (optional)",
      saved:        "Image saved to your photos",
      permDenied:   "Permission needed",
      permMsg:      "Allow access to photos to save this image.",
    },

    // Learn tab
    learn: {
      eyebrow:         "Ballegho · بلّغوا",
      title:           "Learn & convey",
      hadithDay:       "Hadith of the Day",
      sunnahWeek:      "Sunnah of the Week",
      weekLabel:       "Week",
      share:           "Ballegh",
      copy:            "Copy",
      collections:     "Collections",
      col40:           "The 40",
      col40sub:        "Core hadith collection",
      colHisn:         "Ḥiṣn al-Muslim",
      colHisnSub:      "Daily adhkār",
      colAkhlaq:       "Akhlāq",
      colAkhlaqSub:    "Character & manners",
      colFood:         "Food & Drink",
      colFoodSub:      "Sunnah at the table",
      copied:          "Copied",
    },

    // Sunnah library (browse-only catalogue)
    library: {
      title:          "Sunnahs",
      active:         "active",          // "13 active · 42 in library"
      inLibrary:      "in library",
      searchPh:       "Search sunnahs",
      filterAll:      "All",
      activeBadge:    "active",          // tiny pill on rows already in practice
      empty:          "No sunnahs match your search",
      loadingError:   "Couldn't load the library",
    },

    // Saved / favorites
    favorites: {
      title:      "Saved",
      filter:     "Saved",
      empty:      "Nothing saved yet",
      emptyHint:  "Tap the heart on any sunnah or hadith to keep it here.",
      profileRow: "Saved",
      sunnahsSection: "Sunnahs",
      hadithSection:  "Hadith",
    },

    // Collections (Learn tab → curated sets)
    collections: {
      label:       "Collection",
      items:       "sunnahs",
      hadithItems: "hadith",
      empty:       "This collection is empty.",
      the40:  { title: "The Forty",        sub: "Al-Nawawī's 40 ḥadīth", desc: "Imam al-Nawawī's celebrated collection on the foundations of Islam — forty-two ḥadīth every Muslim should know." },
      qudsi:  { title: "Hadith Qudsi",    sub: "Sacred narrations",       desc: "Forty sacred ḥadīth in which Allah ﷻ speaks in His own words, narrated by the Prophet ﷺ." },
      hisn:   { title: "Ḥiṣn al-Muslim", sub: "Daily adhkār",          desc: "Morning, evening and bedtime remembrances and supplications from the Sunnah." },
      akhlaq: { title: "Akhlāq",          sub: "Character & manners",    desc: "Sunnahs of good character — how the Prophet ﷺ met and treated people." },
      food:   { title: "Food & Drink",    sub: "Sunnah at the table",    desc: "The etiquette of eating and drinking as taught by the Prophet ﷺ." },
    },

    // Hadith reader
    hadith: {
      number:      "Hadith",
      translation: "Translation",
      of:          "of",
      prev:        "Previous",
      next:        "Next",
    },

    // Onboarding flow
    onboarding: {
      continue:  "Continue",
      done:      "Done",

      // step1 — welcome
      s1: {
        hadithEn:  "\"The most beloved deeds to Allah are those done\nmost consistently, even if they are few.\"",
        source:    "— Bukhārī & Muslim",
        tagline1:  "This isn't about doing more.",
        tagline2pre: "It's about becoming who you already ",
        tagline2gold: "want to be.",
        cta:       "I'm ready",
      },

      // step2 — sleep schedule
      s2: {
        eyebrow:    "STEP 1 OF 5",
        titlePre:   "When does your\nday begin and ",
        titleGold:  "end?",
        titlePost:  "",
        subtitle:   "We'll place your sunnahs at the right\nmoments in your day.",
        wakeLabel:  "I usually wake up",
        wakeSub:    "morning start",
        sleepLabel: "I usually sleep around",
        sleepSub:   "end of day",
      },

      // step3 — consistency level
      s3: {
        eyebrow:   "STEP 2 OF 5",
        titlePre:  "Where are you\nright now — ",
        titleGold: "honestly?",
        titlePost: "",
        subtitle:  "No wrong answer. This shapes your starting point.",
        note:      "✦ You can always change this later",
        beginnerLabel:   "Just starting",
        beginnerSub:     "I want to build from scratch",
        someLabel:       "Some habits",
        someSub:         "I do a few things, not consistently",
        consistentLabel: "Looking to deepen",
        consistentSub:   "I'm consistent and want to grow",
      },

      // step4 — pick sunnahs
      s4: {
        eyebrow:   "STEP 3 OF 5",
        titlePre:  "Pick ",
        titleGold: "1 to 3",
        titlePost: "\nsunnahs to start with.",
        subtitle:  "You can always add more. Small steps build lasting habits.",
        selected:  "selected",
        capText:   "Start with 3. The Prophet ﷺ said the most beloved deeds are the most consistent, even if few.",
        // Variant shown to already-consistent users (step3 = "Looking to deepen")
        expTitlePre:  "Mark the sunnahs\nyou ",
        expTitleGold: "already keep",
        expTitlePost: ".",
        expSubtitle:  "These become your daily baseline — Ballegho grows your practice from here.",
        expCapText:   "Pick the ones you already do consistently — up to 7. You'll unlock more over time.",
      },

      // step5 — anchor sunnah
      s5: {
        eyebrow:      "STEP 4 OF 5",
        titlePre:     "Choose your\n",
        titleGold:    "anchor sunnah.",
        titlePost:    "",
        explainTitle: "What is an anchor?",
        explainBody:  "Your anchor is the one sunnah that protects your streak.\n\nEven on your hardest day — if you do just this one thing — you keep going.\n\nEverything else is a bonus.",
      },

      // step6 — commitment + sign-up
      s6: {
        journey:      "Your journey begins with",
        closing:      "One small act. Every day. That's enough.",
        saveLabel:    "Save your journey",
        namePh:       "Your name",
        emailPh:      "Email address",
        passwordPh:   "Password (6+ characters)",
        begin:        "Begin",
        haveAccount:  "Already have an account?",
        signIn:       "Sign in",
        errName:      "Please enter your name.",
        errEmail:     "Please enter your email.",
        errPassword:  "Password must be at least 6 characters.",
        errGeneric:   "Something went wrong. Please try again.",
      },
    },
  },

  ar: {
    // Date / greeting
    greeting:    "السَّلَامُ عَلَيْكُم",
    greetingGold: "عَلَيْكُم",
    greetingBase: "السَّلَامُ ",

    // Hijri month names
    hijriMonths: [
      "مُحَرَّم", "صَفَر", "رَبِيع الأَوَّل", "رَبِيع الآخِر",
      "جُمَادَى الأُولَى", "جُمَادَى الآخِرَة", "رَجَب", "شَعْبَان",
      "رَمَضَان", "شَوَّال", "ذُو القَعْدَة", "ذُو الحِجَّة",
    ],

    // Weekdays
    weekdays: ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],
    // Single-char day abbreviations (standard Arabic calendar letters, index 0 = Sunday)
    weekdayLetters: ["ح","ا","ث","ر","خ","ج","س"],

    // Prayer names
    prayers: {
      fajr:    { name: "الفجر",  short: "فجر"  },
      dhuhr:   { name: "الظهر",  short: "ظهر"  },
      asr:     { name: "العصر",  short: "عصر"  },
      maghrib: { name: "المغرب", short: "مغرب" },
      isha:    { name: "العشاء", short: "عشاء" },
    },
    nextPrayer: "التالية",
    prayerNow:  "حان وقتها",
    locationNeeded: "فعّل الموقع لأوقات الصلاة",

    // Tab labels
    tabToday:    "اليوم",
    tabSunnah:   "السنة",
    tabAdhkar:   "الأذكار",
    tabStreaks:  "تقدّم",
    tabLearn:    "تعلّم",
    tabProfile:  "حسابي",

    // Welcome screen
    welcome: {
      begin:      "ابدأ رحلتك",
      haveAccount:"لدي حساب بالفعل",
    },

    // Prayer strip
    tapToRetry: "اضغط للمحاولة مجدداً",

    // Home screen
    home: {
      noSunnahs:       "لا توجد سنن نشطة بعد",
      sunnahsToday:    "سنة اليوم",
      dayStreak:       "يوم متتالي",
      // Maghrib day boundary
      dayResetsAt:     "اليوم الهجري ينتهي عند المغرب",
      newDayBegan:     "يوم هجري جديد · بداية جديدة",
      // Streak warning
      streakSeal:      "أتمّ سلسلتك قبل المغرب",
      streakAnchor:    "أتمّ سنتك المرساة",
      minutesLeft:     "دقيقة متبقية",
      // Anchor completion blessing — produces "بارك الله فيك · اليوم الـ٢"
      blessingDay:     "اليوم الـ",
    },

    // Adaptive coach (Today screen — unlock / reduce / recover)
    coach: {
      unlockEyebrow:  "فُتِحت",
      unlockTitle:    "أنت جاهز لسنّة أخرى",
      unlockBody:     "داومتَ فأحسنت، ما شاء الله. اختَر سنّة لطيفة واحدة تضيفها إلى يومك:",
      reduceEyebrow:  "خفّف الحِمل",
      reduceTitle:    "أيام مزدحمة؟",
      reduceBody:     "احمِ سلسلتك — أبقِ سنتك المرساة وأوقف سنّتين مؤقتًا. يمكنك العودة إليها متى شئت.",
      reduceCta:      "أوقفها مؤقتًا",
      recoverEyebrow: "أهلًا بعودتك",
      recoverTitle:   "أكمِل من حيث توقّفت",
      recoverBody:    "السلسلة لم تنقطع — إنها تنتظرك. ابدأ من جديد بسنتك المرساة وحدها، وابنِ من هناك.",
      recoverCta:     "ابدأ برِفق",
    },

    // Nūr (النقاط)
    nur: {
      label:       "نور",
      balance:     "الرصيد",
      unlock:      "افتح",
      unlockTitle: "افتح هذه السمة",
      notEnough:   "لا يكفي النور بعد — واصِل.",
      cancel:      "إلغاء",
    },

    // شرح النور لأول مرة (تلميح يظهر مرة واحدة)
    nurTip: {
      title:     "حصلتَ على أول نور لك ✨",
      body:      "النور يزداد كلّما داومتَ وبلّغتَ الخير. إنما هو تشجيعٌ لتستمرّ — وليس مقياسًا لعبادتك.",
      earnTitle: "اكسب النور بـ",
      earnDo:    "أداء سنة",
      earnExtra: "تجربة سنة إضافية",
      earnShare: "مشاركة سنة",
      spend:     "أنفِقه على سمات جميلة لبطاقة المشاركة — والمزيد قريبًا إن شاء الله.",
      cta:       "هيا بنا",
    },

    // Streaks / Progress tab
    streaks: {
      eyebrow:        "رحلتك",
      title:          "تقدّمك",
      currentStreak:  "الأيام المتتالية",
      days:           "يوم",
      best:           "الأفضل",
      thisMonth:      "هذا الشهر",   // "active days this month" — value shows count only now
      total:          "الإجمالي",
      activity:       "النشاط",
      last5Weeks:     "آخر ٥ أسابيع",
      milestones:     "الإنجازات",
      mostConsistent: "الأكثر مواظبة",
      noData:         "أتمم السنن لتبدأ ببناء سلسلتك.",
    },

    // Sunnah detail page
    sunnah: {
      hadithLabel:  "الحديث",
      aboutLabel:   "عن هذه السنة",
      statsLabel:   "إحصائياتك",
      dayStreak:    "يوم متتالي",
      totalDone:    "مرة",
      thisWeek:     "هذا الأسبوع",
      bestStreak:   "أفضل سلسلة",
      days:         "يوم",
      doneToday:    "تمّ ✓",
      markDone:     "أتممتها اليوم",
      remove:       "إزالة من ممارستي",
      cantRemove:   "لا يمكن الإزالة",
      cantRemoveMsg:"هذه هي سنتك المرساة. غيّر المرساة أولاً من ملفك الشخصي.",
      confirmRemove:"إزالة السنة",
      confirmMsg:   "إزالة من ممارستك؟",
      cancel:       "إلغاء",
      // Counter (sebha) interaction
      tapToCount:   "اضغط للعدّ",
      counterDone:  "تمّ اليوم",
      reset:        "إعادة",
      of:           "من",
      markNotDone:  "وضع كغير مُنجَز اليوم",
      willUnlock:   "يضيف لك بلّغوا سننًا جديدة كلّما داومت — واصِل وقد تُفتح لك هذه السنة قريبًا.",
      didOnce:      "فعلتُها مرّة",
      didOnceDone:  "فُعِلت مرّة اليوم ✓",
      startSession: "ابدأ الجلسة",
      continueSession: "تابِع الجلسة",
      sessionDoneToday: "اكتملت جلسة اليوم ✓",
    },

    // Adhkār playlist player
    adhkar: {
      reward:       "الفضل",
      upNext:       "التالي",
      allItems:     "كل الأذكار · اختر أيّها",
      of:           "من",
      times:        "×",
      complete:     "اكتملت الجلسة",
      completeSub:  "تقبّل الله منك.",
      backToAll:    "تمّ",
      empty:        "لا توجد أذكار في هذه الجلسة بعد.",
      doneForToday: "أنهيت لليوم",
      sealedPartial:"محفوظ لليوم",
      keepGoing:    "ليس بعد — أكمل",
    },

    // Milestone celebration card
    milestones: {
      eyebrow:  "إنجاز",
      days:     "يوم متتالياً",
      dismiss:  "الحمد لله",
      // 7 days
      m7head:   "٧ أيام",
      m7body:   "قال النبي ﷺ: أحبُّ الأعمالِ إلى اللهِ أدومُها وإن قلَّ.",
      m7hadith: "أحبُّ الأعمالِ إلى اللهِ أدومُها وإن قلَّ",
      m7source: "البخاري ومسلم",
      // 14 days
      m14head:  "أسبوعان",
      m14body:  "سبحان الله — أسبوعان على الطريق الصحيح.",
      // 21 days
      m21head:  "٢١ يوماً",
      m21body:  "العادات تبدأ تترسّخ الآن — ما شاء الله. واصل.",
      // 40 days
      m40head:  "٤٠ يوماً",
      m40body:  "من داوم على شيء أصبح منه.",
      // 100 days
      m100head: "١٠٠ يوم",
      m100body: "ما شاء الله. لقد جعلت السنة جزءاً من طبعك.",
    },

    // Share card
    share: {
      button:       "مشاركة",
      title:        "شارك هذه السنة",
      shareImage:   "مشاركة الصورة",
      savePhoto:    "حفظ في الصور",
      messagePh:    "أضف رسالة (اختياري)",
      saved:        "تم حفظ الصورة في مكتبة صورك",
      permDenied:   "مطلوب إذن",
      permMsg:      "اسمح بالوصول للصور لحفظ الصورة.",
    },

    // Learn tab
    learn: {
      eyebrow:         "بلّغوا",
      title:           "تعلّم وبلّغ",
      hadithDay:       "حديث اليوم",
      sunnahWeek:      "سنة الأسبوع",
      weekLabel:       "الأسبوع",
      share:           "بلّغ",
      copy:            "نسخ",
      collections:     "المجموعات",
      col40:           "الأربعون",
      col40sub:        "مجموعة أحاديث أساسية",
      colHisn:         "حصن المسلم",
      colHisnSub:      "أذكار يومية",
      colAkhlaq:       "الأخلاق",
      colAkhlaqSub:    "الأخلاق والآداب",
      colFood:         "الطعام والشراب",
      colFoodSub:      "سنن الأكل والشرب",
      copied:          "تم النسخ",
    },

    // Sunnah library (browse-only catalogue)
    library: {
      title:          "السنن",
      active:         "نشطة",
      inLibrary:      "في المكتبة",
      searchPh:       "ابحث في السنن",
      filterAll:      "الكل",
      activeBadge:    "نشطة",
      empty:          "لا توجد سنن تطابق بحثك",
      loadingError:   "تعذّر تحميل المكتبة",
    },

    // Saved / favorites
    favorites: {
      title:      "المحفوظات",
      filter:     "المحفوظات",
      empty:      "لا توجد عناصر محفوظة بعد",
      emptyHint:  "اضغط على القلب في أي سنة أو حديث لحفظه هنا.",
      profileRow: "المحفوظات",
      sunnahsSection: "السنن",
      hadithSection:  "الأحاديث",
    },

    // Collections (Learn tab → curated sets)
    collections: {
      label:       "مجموعة",
      items:       "سنن",
      hadithItems: "حديثاً",
      empty:       "هذه المجموعة فارغة.",
      the40:  { title: "الأربعون النووية", sub: "أربعون الإمام النووي",    desc: "مجموعة الإمام النووي المشهورة في أصول الإسلام — اثنان وأربعون حديثاً ينبغي لكل مسلم معرفتها." },
      qudsi:  { title: "الأحاديث القدسية", sub: "أربعون حديثاً قدسياً",  desc: "أربعون حديثاً قدسياً يتحدث فيها الله ﷻ بلسانه على لسان نبيه ﷺ." },
      hisn:   { title: "حصن المسلم", sub: "أذكار يومية",          desc: "أذكار الصباح والمساء والنوم والأدعية من السنة النبوية." },
      akhlaq: { title: "الأخلاق",    sub: "الأخلاق والآداب",      desc: "سنن حسن الخلق — كيف لقي النبي ﷺ الناس وعاملهم." },
      food:   { title: "الطعام والشراب", sub: "سنن المائدة",       desc: "آداب الأكل والشرب كما علّمنا النبي ﷺ." },
    },

    // Hadith reader
    hadith: {
      number:      "حديث",
      translation: "الترجمة",
      of:          "من",
      prev:        "السابق",
      next:        "التالي",
    },

    // Onboarding flow
    onboarding: {
      continue:  "متابعة",
      done:      "تم",

      // step1 — welcome
      s1: {
        hadithEn:  "«أحبُّ الأعمالِ إلى اللهِ أدومُها\nوإن قلّ.»",
        source:    "— البخاري ومسلم",
        tagline1:  "ليس الأمر عن فعل المزيد.",
        tagline2pre: "بل عن أن تصبح ",
        tagline2gold: "ما تريد.",
        cta:       "أنا مستعد",
      },

      // step2 — sleep schedule
      s2: {
        eyebrow:    "الخطوة ١ من ٥",
        titlePre:   "متى يبدأ يومك\n",
        titleGold:  "وينتهي؟",
        titlePost:  "",
        subtitle:   "سنضع سننك في الأوقات\nالمناسبة من يومك.",
        wakeLabel:  "عادةً أستيقظ",
        wakeSub:    "بداية الصباح",
        sleepLabel: "عادةً أنام حوالي",
        sleepSub:   "نهاية اليوم",
      },

      // step3 — consistency level
      s3: {
        eyebrow:   "الخطوة ٢ من ٥",
        titlePre:  "أين أنت\nالآن — ",
        titleGold: "بصدق؟",
        titlePost: "",
        subtitle:  "لا توجد إجابة خاطئة. هذا يحدّد نقطة انطلاقك.",
        note:      "✦ يمكنك تغيير هذا لاحقًا دائمًا",
        beginnerLabel:   "أبدأ للتو",
        beginnerSub:     "أريد البناء من الصفر",
        someLabel:       "بعض العادات",
        someSub:         "أفعل بعض الأشياء، لكن دون انتظام",
        consistentLabel: "أريد التعمّق",
        consistentSub:   "أمارس بانتظام وأريد المزيد",
      },

      // step4 — pick sunnahs
      s4: {
        eyebrow:   "الخطوة ٣ من ٥",
        titlePre:  "اختر ",
        titleGold: "١ إلى ٣",
        titlePost: "\nمن السنن لتبدأ بها.",
        subtitle:  "يمكنك إضافة المزيد دائمًا. الخطوات الصغيرة تبني عادات راسخة.",
        selected:  "مختارة",
        capText:   "ابدأ بثلاث. قال النبي ﷺ إن أحب الأعمال أدومها وإن قلّ.",
        // نسخة تظهر لمن يواظب بالفعل (الخطوة ٣ = "أريد التعمّق")
        expTitlePre:  "اختَر السنن\nالتي ",
        expTitleGold: "تواظب عليها",
        expTitlePost: ".",
        expSubtitle:  "ستكون هذه أساس يومك، ويبني بلّغوا ممارستك انطلاقًا منها.",
        expCapText:   "اختر ما تداوم عليه فعلًا — حتى سبع سنن. ستُفتح لك المزيد مع الوقت.",
      },

      // step5 — anchor sunnah
      s5: {
        eyebrow:      "الخطوة ٤ من ٥",
        titlePre:     "اختر\n",
        titleGold:    "سنتك المرساة.",
        titlePost:    "",
        explainTitle: "ما هي السنة المرساة؟",
        explainBody:  "سنتك المرساة هي السنة الواحدة التي تحمي سلسلتك.\n\nحتى في أصعب أيامك — إن فعلت هذا الشيء الوحيد — تستمر.\n\nكل ما عداه مكافأة.",
      },

      // step6 — commitment + sign-up
      s6: {
        journey:      "تبدأ رحلتك بـ",
        closing:      "عمل صغير واحد. كل يوم. هذا يكفي.",
        saveLabel:    "احفظ رحلتك",
        namePh:       "اسمك",
        emailPh:      "البريد الإلكتروني",
        passwordPh:   "كلمة المرور (٦ أحرف فأكثر)",
        begin:        "ابدأ",
        haveAccount:  "هل لديك حساب بالفعل؟",
        signIn:       "تسجيل الدخول",
        errName:      "الرجاء إدخال اسمك.",
        errEmail:     "الرجاء إدخال بريدك الإلكتروني.",
        errPassword:  "يجب أن تتكوّن كلمة المرور من ٦ أحرف على الأقل.",
        errGeneric:   "حدث خطأ ما. الرجاء المحاولة مرة أخرى.",
      },
    },
  },
} as const;
