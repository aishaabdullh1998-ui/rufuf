/* مكتبة رفوف — المدقّق السريع: الأسلوب وعلامات الترقيم (يعمل على جهاز الطالب، ولا يرسل النص إلى أي مكان)
 * window.rufufCheck(text) ← قائمة ملاحظات: {s, e, w, type, msg, fix:[…]}
 * type: "أسلوب" | "ترقيم"
 */
(function(){
  var AL = "ء-يً-ْٰـ";
  var WORD = new RegExp("[" + AL + "]+", "g");
  var bare = function(w){ return w.replace(/[ً-ْٰـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه"); };
  var AR = function(n){ return String(n).replace(/\d/g, function(d){ return "٠١٢٣٤٥٦٧٨٩"[d]; }); };

  // كلمات لا يُعدّ تكرارها ضعفًا
  var STOP = ("في من الى على عن مع ان او ثم قد لا ما لم لن كان كانت هو هي هم انا انت نحن هذا هذه ذلك تلك الذي التي الذين كل بعض عند حتى اذا لكن بل قال قالت ثم يا له لها لهم به بها فيه فيها منه منها اليه اليها عليه عليها حين لما كما بعد قبل").split(" ");
  var STOPSET = {}; STOP.forEach(function(w){ STOPSET[w] = 1; });
  // عامية ← فصيح
  var COLLOQ = { "وايد":"كثيرًا", "ليش":"لماذا", "شو":"ماذا", "ايش":"ماذا", "مب":"ليس", "مو":"ليس", "عشان":"لكي", "علشان":"لكي", "بعدين":"بعد ذلك", "الحين":"الآن", "هيك":"هكذا", "كذي":"هكذا", "زين":"جيّد", "يبا":"يريد", "ابغى":"أريد", "ابغي":"أريد", "يبغى":"يريد", "ودي":"أودّ", "شي":"شيء", "حق":"لـ" };
  delete COLLOQ["حق"];
  var Q = ["هل","لماذا","كيف","متي","اين","ماذا","كم","اي","ايهما","الا","اما"];
  var SAY = ["قال","قالت","سال","سالت","صاح","صاحت","همس","همست","اجاب","اجابت","صرخ","صرخت","نادي","نادت","ردد","رددت"];
  var TO = ["له","لها","لهم","لي","لنا","لك","في","بصوت","بهدوء","بفرح","بحزن","بغضب","وهو","وهي","امه","ابوه","لامه","لابيه","لصديقه","لصديقته","لاخيه","لاخته"];

  window.rufufCheck = function(text){
    var out = [], m, toks = [];
    WORD.lastIndex = 0;
    while ((m = WORD.exec(text))) toks.push({ s:m.index, e:m.index + m[0].length, w:m[0], b:bare(m[0]) });
    var gap = function(a, b){ return text.slice(a.e, b.s); };

    /* ---------- الأسلوب ---------- */
    toks.forEach(function(t, k){
      var b = t.b.replace(/^[وف](?=..)/, "");
      // عامية
      var cw = COLLOQ[t.b] || COLLOQ[b];
      if (cw){ out.push({ s:t.s, e:t.e, w:t.w, type:"أسلوب", msg:"«" + t.w + "» كلمة عاميّة، والقصة تُكتب بالفصحى.", fix:[(COLLOQ[t.b] ? "" : t.w[0]) + cw] }); return; }
      // تكرار الكلمة متتالية
      var nx = toks[k + 1];
      if (nx && nx.b === t.b && t.b.length > 1 && /^\s+$/.test(gap(t, nx))){
        out.push({ s:t.s, e:nx.e, w:text.slice(t.s, nx.e), type:"أسلوب", msg:"تكرّرت الكلمة مرّتين متتاليتين. إن أردت المبالغة فجرّب تعبيرًا أقوى، مثل: «سعيد جدًّا» ← «في غاية السعادة».", fix:[t.w] });
      }
    });

    // الكلمة نفسها ثلاث مرّات فأكثر في مساحة قصيرة (٤٠ كلمة)
    var seen = {};
    toks.forEach(function(t, k){
      var b = t.b.replace(/^(?:وال|فال|بال|ال|و|ف)(?=...)/, "");
      if (b.length < 3 || STOPSET[b] || STOPSET[t.b]) return;
      (seen[b] = seen[b] || []).push(k);
      var L = seen[b].filter(function(i){ return k - i <= 40; });
      if (L.length === 3 && !seen[b].flagged){
        seen[b].flagged = 1;
        var t0 = toks[L[2]];
        out.push({ s:t0.s, e:t0.e, w:t0.w, type:"أسلوب", msg:"استعملت «" + toks[L[0]].w + "» " + AR(3) + " مرّات في سطور قليلة. جرّب كلمة أخرى بالمعنى نفسه حتى لا يملّ القارئ.", fix:[] });
      }
    });

    // الجمل: الطول، كثرة الواو، بداية متكرّرة، كثرة «ثم» و«جدًّا»
    var sre = /[^.!؟\n]+[.!؟]*/g, sents = [];
    while ((m = sre.exec(text))){ var st = m.index + m[0].search(/\S/); if (st < m.index) continue; sents.push({ s:st, e:m.index + m[0].length, t:m[0].trim() }); }
    sents.forEach(function(S, i){
      var ws = S.t.match(WORD) || [];
      if (ws.length > 30){
        out.push({ s:S.s, e:S.s + Math.min(25, S.t.length), w:S.t.slice(0, 25) + "…", type:"أسلوب", msg:"جملة طويلة (" + AR(ws.length) + " كلمة) بلا نقطة. قسّمها إلى جملتين أو ثلاث، ليسهل على القارئ فهمها.", fix:[] });
      } else {
        var waw = ws.filter(function(w, j){ return j > 0 && /^و[ء-ي]{2,}/.test(w) && !/^(?:وقف|وصل|وجد|وضع|ولد|وقت|وجه|وراء|وسط|وحيد|ورق|وردة|ورد|واحد|واسع|ودّ|وعد)/.test(bare(w)); }).length;
        if (waw >= 5) out.push({ s:S.s, e:S.s + Math.min(25, S.t.length), w:S.t.slice(0, 25) + "…", type:"أسلوب", msg:"في هذه الجملة " + AR(waw) + " أحداث تربطها الواو (و… و… و…). ضع نقطة أو فاصلة بين بعضها، أو استعمل: «ثمّ»، «فـ»، «وحين»، «بعد ذلك».", fix:[] });
      }
      var P = sents[i - 1];
      if (P){
        var a = bare((P.t.match(WORD) || [""])[0]), b = bare((ws[0] || ""));
        if (a && a === b && a.length > 1 && !/^(?:ثم|قال|قالت)$/.test(a)){
          out.push({ s:S.s, e:S.s + ws[0].length, w:ws[0], type:"أسلوب", msg:"بدأت جملتين متتاليتين بالكلمة نفسها «" + ws[0] + "». نوّع البداية؛ مثلًا: ابدأ بالزمان («وفي الصباح…») أو بالمكان أو بالشخصية.", fix:[] });
        }
      }
    });
    function overuse(re, word, alt){
      var hits = [], r = new RegExp(re, "g");
      while ((m = r.exec(text))) hits.push(m.index + m[1].length);
      if (hits.length >= 3){ var p = hits[2]; out.push({ s:p, e:p + word.length, w:word, type:"أسلوب", msg:"كرّرت «" + word + "» " + AR(hits.length) + " مرّات. جرّب أحيانًا: " + alt + ".", fix:[] }); }
    }
    overuse("(^|[^" + AL + "])ثم(?![" + AL + "])", "ثم", "«بعد ذلك»، «وحين…»، «فـ»، «وما إن…»");
    overuse("(^|[^" + AL + "])جدا(?![" + AL + "])", "جدا", "كلمة أقوى بدلها، مثل: «فرح فرحًا عظيمًا»، «في غاية الجمال»، «شديد البرودة»");

    /* ---------- علامات الترقيم ---------- */
    [[/,/g, "،", "الفاصلة العربية تُكتب «،» لا «,»."], [/\?/g, "؟", "علامة الاستفهام العربية تُكتب «؟»."], [/;/g, "؛", "الفاصلة المنقوطة العربية تُكتب «؛»."]]
      .forEach(function(r){ while ((m = r[0].exec(text))) out.push({ s:m.index, e:m.index + 1, w:m[0], type:"ترقيم", msg:r[2], fix:[r[1]] }); });
    var sp = /[ \t]+([،.؟!:؛])/g;
    while ((m = sp.exec(text))) out.push({ s:m.index, e:m.index + m[0].length, w:m[0], type:"ترقيم", msg:"لا نترك مسافة قبل علامة الترقيم؛ تلتصق العلامة بالكلمة التي قبلها.", fix:[m[1]] });
    var ns = new RegExp("([،؟!؛.:])(?=[" + AL + "«])", "g");
    while ((m = ns.exec(text))) out.push({ s:m.index, e:m.index + 1, w:m[0], type:"ترقيم", msg:"نترك مسافة واحدة بعد علامة الترقيم.", fix:[m[1] + " "] });
    var ds = / {2,}/g;
    while ((m = ds.exec(text))) out.push({ s:m.index, e:m.index + m[0].length, w:"مسافتان", type:"ترقيم", msg:"توجد مسافة زائدة بين كلمتين.", fix:[" "] });
    var rp = /([!؟?.])\1{1,}(?!\.)|([!؟]){2,}/g;
    while ((m = rp.exec(text))){ if (/^\.{3}$/.test(m[0])) continue; out.push({ s:m.index, e:m.index + m[0].length, w:m[0], type:"ترقيم", msg:"تكفي علامة واحدة؛ تكرارها لا يزيد المعنى قوّة.", fix:[m[0][0]] }); }

    // السؤال يُختم بـ«؟»
    sents.forEach(function(S){
      var ws = S.t.match(WORD) || []; if (!ws.length) return;
      var f = bare(ws[0]).replace(/^[وف](?=..)/, "");
      var end = S.t.slice(-1);
      if (Q.indexOf(f) > -1 && f !== "من" && end !== "؟" && end !== "?"){
        var lastW = ws[ws.length - 1], li = S.s + S.t.lastIndexOf(lastW);
        if (/[.!]$/.test(S.t)){ var ep = S.s + S.t.length - 1; out.push({ s:ep, e:ep + 1, w:end, type:"ترقيم", msg:"هذه جملة استفهام (تبدأ بـ«" + ws[0] + "»)، فتنتهي بعلامة الاستفهام «؟».", fix:["؟"] }); }
        else out.push({ s:li, e:li + lastW.length, w:lastW, type:"ترقيم", msg:"هذه جملة استفهام (تبدأ بـ«" + ws[0] + "»)، فتنتهي بعلامة الاستفهام «؟».", fix:[lastW + "؟"] });
      }
    });

    // النقطتان بعد «قال» قبل الكلام المنقول
    toks.forEach(function(t, k){
      var b = t.b.replace(/^[وف](?=..)/, "");
      if (SAY.indexOf(b) < 0) return;
      var j = k; while (toks[j + 1] && TO.indexOf(toks[j + 1].b) > -1 && /^\s+$/.test(gap(toks[j], toks[j + 1]))) j++;
      var last = toks[j], after = text.slice(last.e, last.e + 3);
      if (!toks[j + 1] || /^\s*[:：«"]/.test(after) || /^[\s]*[،.؟!]/.test(after) || toks[j + 1].s - last.e > 2) return;
      out.push({ s:last.s, e:last.e, w:last.w, type:"ترقيم", msg:"بعد فعل القول («" + t.w + "») نضع نقطتين (:) قبل الكلام المنقول مباشرة، ويحسن أن نضعه بين علامتي التنصيص « »، مثل: قال له أبي: «تعال يا سالم».", fix:[] });
    });

    // نهاية الفقرة بلا علامة
    var lines = text.split("\n"), pos = 0;
    lines.forEach(function(ln, i){
      var tr = ln.replace(/\s+$/, "");
      if (tr && new RegExp("[" + AL + "»\"]$").test(tr) && (i < lines.length - 1 ? lines.slice(i + 1).join("").trim() : true)){
        var lw = (tr.match(WORD) || [""]).pop(), p = pos + tr.length - lw.length;
        if (lw) out.push({ s:p, e:p + lw.length, w:lw, type:"ترقيم", msg:(i === lines.length - 1 ? "تنتهي القصة" : "تنتهي الفقرة") + " بنقطة (.)، أو بعلامة تعجّب أو استفهام إن كانت الجملة كذلك.", fix:[lw + "."] });
      }
      pos += ln.length + 1;
    });

    out.sort(function(a, b){ return a.s - b.s || b.e - a.e; });
    var res = [], lastE = -1;
    out.forEach(function(o){ if (o.s >= lastE){ res.push(o); lastE = o.e; } });
    return res;
  };
})();
