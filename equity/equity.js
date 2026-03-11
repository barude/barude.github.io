(() => {
  "use strict";

  const STORAGE_KEY = "equity.project.v1";

  const DEFAULT_ROLES = [
    {
      key: "direction",
      label: "Direction",
      pts: 10,
      desc: "Creative leadership, decision-making, visual language.",
      examples: ["Creative vision", "Final decisions", "Tone and approach"],
    },
    {
      key: "writing",
      label: "Writing / Research",
      pts: 10,
      desc: "Scriptwriting, story development, investigative work.",
      examples: ["Treatment / script text", "Narrative structure", "Research, interviews"],
    },
    {
      key: "post",
      label: "Post / Technical",
      pts: 9,
      desc: "Editing, color, VFX, coding, technical pipeline.",
      examples: ["Editing", "Color / VFX", "Coding / pipeline"],
    },
    {
      key: "sound",
      label: "Sound / Music",
      pts: 9,
      desc: "Recording, sound design, scoring, mixing.",
      examples: ["Sound design", "Score / music", "Mixing / delivery"],
    },
    {
      key: "performance",
      label: "Performance",
      pts: 8,
      desc: "On-camera, voice, public-facing presence.",
      examples: ["On-camera", "Voice performance", "Live delivery"],
    },
    {
      key: "image_capture",
      label: "Image / Capture",
      pts: 8,
      desc: "Cinematography, lighting, stills, on-set image capture.",
      examples: ["Camera work", "On-set lighting", "Photography"],
    },
    {
      key: "design_visual",
      label: "Design / Visual Identity",
      pts: 7,
      desc: "Visual design and graphic systems.",
      examples: ["Deck layout + visual language", "Posters / key art", "Title / logo design"],
    },
    {
      key: "production_logistics",
      label: "Production / Logistics",
      pts: 7,
      desc: "Planning, scheduling, logistics, crew coordination.",
      examples: ["Scheduling", "Crew / vendors", "Operations"],
    },
    {
      key: "funding_work",
      label: "Funding Work",
      pts: 7,
      desc: "Fundraising, grant writing, investor relations.",
      examples: ["Grant writing", "Fundraising", "Investor outreach"],
    },
    {
      key: "brand",
      label: "Brand / Client",
      pts: 6,
      desc: "Client relations, partnerships, brand alignment.",
      examples: ["Client comms", "Partnerships", "Alignment / approvals"],
    },
    {
      key: "distribution",
      label: "Distribution / Comms",
      pts: 6,
      desc: "Marketing, release strategy, audience development.",
      examples: ["Release strategy", "Press / outreach", "Community / audience"],
    },
  ];

  const STATUS_ORDER = ["lead", "partner", "contributor"];
  const STATUS_UNITS = { lead: 3, partner: 2, contributor: 1 };
  const STATUS_LABELS = { lead: "Lead", partner: "Partner", contributor: "Contributor" };

  const CURRENCY = ["EGP", "AED", "SAR", "USD", "EUR", "GBP"];
  const CURRENCY_PREFIX = { EGP: "E£", AED: "AED", SAR: "SAR", USD: "$", EUR: "€", GBP: "£" };

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function clamp(n, lo, hi) {
    return Math.min(Math.max(n, lo), hi);
  }

  function formatDateYYYYMMDD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseNumber(text) {
    if (typeof text !== "string") return 0;
    const cleaned = text.replace(/[^0-9.\-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function formatMoney(code, amount) {
    const prefix = CURRENCY_PREFIX[code] || code;
    const n = Number(amount);
    const safe = Number.isFinite(n) ? n : 0;
    const pretty = safe.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (prefix === "$" || prefix === "€" || prefix === "£") return `${prefix}${pretty}`;
    return `${prefix} ${pretty}`;
  }

  function initAssignments(roles) {
    const obj = {};
    for (const role of roles) obj[role.key] = { active: false, members: [], notes: "" };
    return obj;
  }

  function cloneDefaultProject() {
    const roles = safeStructuredClone(DEFAULT_ROLES);
    return {
      name: "",
      desc: "",
      currency: "USD",
      participants: [{ id: uid(), name: "" }],
      roles,
      assignments: initAssignments(roles),
      financePool: { mode: "none", pct: 50, funders: [] },
      workPool: { pct: 100 },
      totals: { netProfit: "" },
    };
  }

  function safeStructuredClone(value) {
    try {
      return structuredClone(value);
    } catch {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function normalizeImportedProject(raw) {
    const fallback = cloneDefaultProject();
    if (!raw || typeof raw !== "object") return fallback;

    const out = fallback;
    const src = raw.project && typeof raw.project === "object" ? raw.project : raw;

    out.name = typeof src.name === "string" ? src.name : "";
    out.desc = typeof src.desc === "string" ? src.desc : "";
    out.currency = CURRENCY.includes(src.currency) ? src.currency : "USD";

    const legacyKeyFor = (newKey) => {
      if (newKey === "image_capture") return "image";
      if (newKey === "production_logistics") return "production";
      return newKey;
    };

    if (Array.isArray(src.roles) && src.roles.length) {
      const keys = new Set(src.roles.map(r => (r && typeof r.key === "string" ? r.key : "")).filter(Boolean));
      const looksLegacy = (keys.has("image") || keys.has("production")) && !keys.has("image_capture") && !keys.has("design_visual");
      if (looksLegacy) {
        out.roles = safeStructuredClone(DEFAULT_ROLES);
      } else {
        out.roles = src.roles
          .filter(r => r && typeof r.key === "string")
          .map(r => ({
            key: r.key,
            label: typeof r.label === "string" ? r.label : r.key,
            pts: Number.isFinite(Number(r.pts)) ? Number(r.pts) : 0,
            desc: typeof r.desc === "string" ? r.desc : "",
            examples: Array.isArray(r.examples) ? r.examples.slice(0, 5).map(String) : [],
          }));
      }
    }

    if (Array.isArray(src.participants)) {
      out.participants = src.participants
        .filter(p => p && typeof p.id === "string")
        .map(p => ({ id: p.id, name: typeof p.name === "string" ? p.name : "" }));
      if (!out.participants.length) out.participants = [{ id: uid(), name: "" }];
    }

    out.assignments = initAssignments(out.roles);
    if (src.assignments && typeof src.assignments === "object") {
      for (const role of out.roles) {
        const a = src.assignments[role.key] || src.assignments[legacyKeyFor(role.key)];
        if (!a || typeof a !== "object") continue;
        const active = !!a.active;
        const notes = typeof a.notes === "string" ? a.notes : "";
        const members = Array.isArray(a.members)
          ? a.members
              .filter(m => m && typeof m.pid === "string")
              .map(m => ({
                pid: m.pid,
                status: STATUS_ORDER.includes(m.status) ? m.status : "contributor",
              }))
          : [];
        out.assignments[role.key] = { active, notes, members };
      }
    }

    out.financePool = { mode: "none", pct: 50, funders: [] };
    if (src.financePool && typeof src.financePool === "object") {
      out.financePool.mode = src.financePool.mode === "funded" ? "funded" : "none";
      out.financePool.pct = clamp(Number(src.financePool.pct) || 50, 30, 60);
      if (Array.isArray(src.financePool.funders)) {
        out.financePool.funders = src.financePool.funders
          .filter(f => f && typeof f.pid === "string")
          .map(f => ({
            pid: f.pid,
            amount: typeof f.amount === "string" ? f.amount : String(f.amount ?? ""),
            riskPremium: typeof f.riskPremium === "string" ? f.riskPremium : String(f.riskPremium ?? "20"),
          }));
      }
    }

    out.totals = { netProfit: "" };
    if (src.totals && typeof src.totals === "object") {
      out.totals.netProfit = typeof src.totals.netProfit === "string" ? src.totals.netProfit : String(src.totals.netProfit ?? "");
    }

    out.workPool = { pct: 100 };
    return out;
  }

  function personFractionInRole(status, allStatuses) {
    const totalUnits = allStatuses.reduce((s, st) => s + (STATUS_UNITS[st] || 0), 0);
    if (totalUnits === 0) return 0;
    return (STATUS_UNITS[status] || 0) / totalUnits;
  }

  function computeWorkScores(assignments, roles, participants) {
    const validRoles = roles.filter(r => {
      const a = assignments[r.key];
      return a && a.active && Array.isArray(a.members) && a.members.length > 0;
    });
    const totalPts = validRoles.reduce((s, r) => s + (Number(r.pts) || 0), 0);
    const scores = {};
    for (const p of participants) scores[p.id] = 0;
    if (!totalPts) return { scores, validRoles, totalPts: 0 };

    for (const role of validRoles) {
      const a = assignments[role.key];
      const members = a.members;
      const allStatuses = members.map(m => m.status);
      const roleWeight = (Number(role.pts) || 0) / totalPts;
      for (const m of members) {
        if (!(m.pid in scores)) continue;
        scores[m.pid] += roleWeight * personFractionInRole(m.status, allStatuses);
      }
    }
    return { scores, validRoles, totalPts };
  }

  function runCalc(project) {
    const issues = [];
    const iPoolPct =
      project.financePool.mode === "funded" ? clamp(Number(project.financePool.pct) || 50, 30, 60) : 0;
    const wPoolPct = 100 - iPoolPct;

    const participants = project.participants.filter(p => (p.name || "").trim());
    if (!participants.length) {
      return {
        ok: false,
        issues: ["Add at least one named collaborator."],
        participants: [],
        validRoles: [],
        totalPts: 0,
        totalFunded: 0,
        iPoolPct,
        wPoolPct,
        people: [],
        sumPct: 0,
      };
    }

    const { scores, validRoles, totalPts } = computeWorkScores(project.assignments, project.roles, participants);
    if (!validRoles.length) issues.push("Activate at least one role and assign at least one collaborator to it.");

    const totalWork = Object.values(scores).reduce((s, x) => s + x, 0);
    if (validRoles.length && totalWork <= 0) issues.push("Work Pool cannot be computed (no valid role contributions).");

    const funders = Array.isArray(project.financePool.funders) ? project.financePool.funders : [];
    const totalFunded = funders.reduce((s, f) => s + parseNumber(String(f.amount ?? "")), 0);
    if (project.financePool.mode === "funded" && totalFunded <= 0) {
      issues.unshift("Add at least one investment or switch to ‘No hard costs’ mode.");
      return {
        ok: false,
        issues,
        participants,
        validRoles,
        totalPts,
        totalFunded,
        iPoolPct,
        wPoolPct,
        people: [],
        sumPct: 0,
      };
    }

    const people = participants.map(p => {
      const wScore = scores[p.id] || 0;
      const wShare = totalWork > 0 ? wScore / totalWork : 0;
      const funder = funders.find(f => f.pid === p.id);
      const fAmount = funder ? parseNumber(String(funder.amount ?? "")) : 0;
      const fShare = totalFunded > 0 ? fAmount / totalFunded : 0;
      const riskPremium = funder ? parseNumber(String(funder.riskPremium ?? "")) : 0;

      return {
        id: p.id,
        name: p.name,
        wScore,
        wSharePct: wShare * 100,
        fSharePct: fShare * 100,
        fAmount,
        riskPremium,
        recoupAmt: fAmount * (1 + riskPremium / 100),
        workPoolContribPct: wShare * wPoolPct,
        finPoolContribPct: fShare * iPoolPct,
        totalProfitPct: wShare * wPoolPct + fShare * iPoolPct,
        isFunder: fAmount > 0,
      };
    });

    people.sort((a, b) => {
      const d = b.totalProfitPct - a.totalProfitPct;
      if (Math.abs(d) > 1e-12) return d;
      return a.name.localeCompare(b.name);
    });

    const sumPct = people.reduce((s, p) => s + p.totalProfitPct, 0);
    const ok = issues.length === 0 && validRoles.length > 0 && totalWork > 0 && Math.abs(sumPct - 100) < 0.01;
    if (validRoles.length > 0 && totalWork > 0 && Math.abs(sumPct - 100) >= 0.05) {
      issues.push("Total share does not sum to 100%. Check funding inputs and role assignments.");
    }

    return {
      ok,
      issues,
      participants,
      validRoles,
      totalPts,
      totalFunded,
      iPoolPct,
      wPoolPct,
      people,
      sumPct,
    };
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportProjectJson() {
    const payload = {
      tool: "Equity",
      version: 1,
      exportedAt: new Date().toISOString(),
      project: safeStructuredClone(project),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob("project.json", blob);
  }

  function importProjectJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        project = normalizeImportedProject(parsed);
        syncPools();
        saveToStorage();
        renderAll();
      } catch {
        alert("Could not import project.json (invalid JSON).");
      }
    };
    reader.readAsText(file);
  }

  let jsPdfLoading = null;
  function loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    if (jsPdfLoading) return jsPdfLoading;

    jsPdfLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });

    return jsPdfLoading;
  }

  async function exportAgreementPdf() {
    const calc = runCalc(project);
    if (!calc.ok) {
      alert(calc.issues[0] || "Cannot export agreement. Fix issues first.");
      return;
    }

    if (!(window.jspdf && window.jspdf.jsPDF)) {
      try {
        await loadJsPdf();
      } catch {
        alert("PDF export needs jsPDF. Connect once to load it, then export.");
        return;
      }
    }

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
    const margin = 52;
    const maxW = page.w - margin * 2;
    let y = margin;

    const currency = project.currency;
    const netProfit = parseNumber(project.totals.netProfit);
    const financePoolAmt = (netProfit * calc.iPoolPct) / 100;
    const workPoolAmt = (netProfit * calc.wPoolPct) / 100;

    function ensureSpace(height) {
      if (y + height <= page.h - margin) return;
      doc.addPage();
      y = margin;
    }

    function h1(text) {
      ensureSpace(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(text, margin, y);
      y += 22;
    }

    function h2(text) {
      if (y > margin) y += 20;
      ensureSpace(54);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text(text.toUpperCase(), margin, y);
      y += 12;
      doc.setDrawColor(215);
      doc.line(margin, y, margin + maxW, y);
      doc.setTextColor(0);
      y += 16;
    }

    function p(text) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const lines = doc.splitTextToSize(text, maxW);
      ensureSpace(lines.length * 13 + 4);
      doc.text(lines, margin, y);
      y += lines.length * 13 + 6;
    }

    function table(headers, rows, colWidths, aligns = []) {
      const fontSize = 9.5;
      doc.setFontSize(fontSize);
      doc.setLineWidth(0.6);

      const padX = 6;
      const padY = 6;
      const rowGap = 0;
      const baseY = 10;

      function rowHeight(cells) {
        let maxLines = 1;
        for (let i = 0; i < cells.length; i++) {
          const w = colWidths[i] - padX * 2;
          const lines = doc.splitTextToSize(String(cells[i] ?? ""), w);
          maxLines = Math.max(maxLines, lines.length);
        }
        return maxLines * 12 + padY * 2 + rowGap;
      }

      const headH = rowHeight(headers);
      ensureSpace(headH + 10);
      doc.setFont("helvetica", "bold");
      let x = margin;
      doc.setDrawColor(225);
      doc.setFillColor(248, 248, 246);
      doc.rect(margin, y, maxW, headH, "F");

      for (let i = 0; i < headers.length; i++) {
        const w = colWidths[i];
        const textLines = doc.splitTextToSize(String(headers[i] ?? ""), w - padX * 2);
        const align = aligns[i] || "left";
        const tx = align === "right" ? x + w - padX : x + padX;
        for (let li = 0; li < textLines.length; li++) {
          doc.text(textLines[li], tx, y + padY + baseY + li * 12, align === "right" ? { align: "right" } : undefined);
        }
        x += w;
      }
      doc.setDrawColor(225);
      doc.line(margin, y + headH, margin + maxW, y + headH);
      y += headH;

      doc.setFont("helvetica", "normal");
      for (const r of rows) {
        const h = rowHeight(r);
        ensureSpace(h + 4);
        x = margin;
        for (let i = 0; i < r.length; i++) {
          const w = colWidths[i];
          const cell = String(r[i] ?? "");
          const lines = doc.splitTextToSize(cell, w - padX * 2);
          const align = aligns[i] || "left";
          const tx = align === "right" ? x + w - padX : x + padX;
          for (let li = 0; li < lines.length; li++) {
            doc.text(lines[li], tx, y + padY + baseY + li * 12, align === "right" ? { align: "right" } : undefined);
          }
          x += w;
        }
        doc.setDrawColor(238);
        doc.line(margin, y + h, margin + maxW, y + h);
        y += h;
      }
      y += 10;
    }

    h1("Equity Agreement");

    const projName = project.name.trim() || "Untitled project";
    const date = formatDateYYYYMMDD(new Date());
    const desc = (project.desc || "").trim();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(projName, margin, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(`Date: ${date}`, margin, y);
    y += 14;

    if (desc) {
      doc.setTextColor(70);
      const lines = doc.splitTextToSize(desc, maxW);
      ensureSpace(lines.length * 12 + 6);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 8;
    } else {
      y += 6;
    }
    doc.setTextColor(0);

    h2("Participants");
    const participantNames = calc.people.map(p => p.name).join(", ");
    p(participantNames || "—");

    h2("Roles");
    const roleByKey = Object.fromEntries(project.roles.map(r => [r.key, r]));
    const roleRows = [];
    for (const role of calc.validRoles) {
      const a = project.assignments[role.key];
      const statuses = a.members.map(m => m.status);
      const roleWeightPct = calc.totalPts > 0 ? ((role.pts / calc.totalPts) * calc.wPoolPct) : 0;
      for (const m of a.members) {
        const person = calc.people.find(p => p.id === m.pid);
        if (!person) continue;
        const frac = personFractionInRole(m.status, statuses);
        const sharePct = roleWeightPct * frac;
        roleRows.push([person.name, roleByKey[role.key]?.label || role.key, STATUS_LABELS[m.status] || m.status, `${sharePct.toFixed(2)}%`]);
      }
    }
    if (!roleRows.length) roleRows.push(["—", "—", "—", "—"]);
    table(
      ["Person", "Role", "Status", "Share %"],
      roleRows,
      [maxW * 0.28, maxW * 0.34, maxW * 0.18, maxW * 0.20],
      ["left", "left", "left", "right"],
    );

    h2("Role Glossary");
    for (const role of calc.validRoles) {
      const r = roleByKey[role.key] || role;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      ensureSpace(18);
      doc.text(r.label || r.key, margin, y);
      y += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80);
      const dLines = doc.splitTextToSize(String(r.desc || ""), maxW);
      if (dLines.length) {
        ensureSpace(dLines.length * 12 + 4);
        doc.text(dLines, margin, y);
        y += dLines.length * 12 + 4;
      }
      doc.setTextColor(0);

      if (Array.isArray(r.examples) && r.examples.length) {
        doc.setFontSize(9.5);
        doc.setTextColor(95);
        const exText = `Examples: ${r.examples.slice(0, 4).join(" · ")}`;
        const exLines = doc.splitTextToSize(exText, maxW);
        ensureSpace(exLines.length * 11 + 6);
        doc.text(exLines, margin, y);
        y += exLines.length * 11 + 6;
        doc.setTextColor(0);
      } else {
        y += 6;
      }
    }

    h2("Financial Summary");
    table(
      ["Item", "Value"],
      [
        ["Total Net Profit", formatMoney(currency, netProfit)],
        [`Finance Pool (${calc.iPoolPct}%)`, formatMoney(currency, financePoolAmt)],
        [`Work Pool (${calc.wPoolPct}%)`, formatMoney(currency, workPoolAmt)],
      ],
      [maxW * 0.55, maxW * 0.45],
      ["left", "right"],
    );

    h2("Final Payouts");
    const payoutRows = calc.people.map(p => {
      const payout = (netProfit * p.totalProfitPct) / 100;
      return [p.name, `${p.totalProfitPct.toFixed(2)}%`, formatMoney(currency, payout)];
    });
    table(
      ["Participant", "Share %", "Payout"],
      payoutRows,
      [maxW * 0.46, maxW * 0.20, maxW * 0.34],
      ["left", "right", "right"],
    );

    h2("Agreement");
    p(
      "The collaborators listed above agree that the allocation described in this document reflects the agreed distribution of project revenue.",
    );

    h2("Signatures");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(120);
    doc.text("Name", margin, y);
    doc.text("Signature", margin + maxW * 0.42, y);
    doc.text("Date", margin + maxW * 0.82, y);
    doc.setTextColor(0);
    y += 10;

    const nameX = margin;
    const sigX = margin + maxW * 0.42;
    const dateX = margin + maxW * 0.82;
    const sigW = maxW * 0.38;
    const dateW = maxW * 0.18;

    for (const person of calc.people) {
      ensureSpace(34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(person.name, nameX, y + 14);
      doc.setFont("helvetica", "normal");
      doc.setDrawColor(120);
      doc.line(sigX, y + 16, sigX + sigW, y + 16);
      doc.line(dateX, y + 16, dateX + dateW, y + 16);
      y += 30;
    }

    const footer = "EQUITY — a shared ledger for creative work, created by Barüde © 2026 · Open Source (MIT)";
    const pages = doc.getNumberOfPages();
    for (let pi = 1; pi <= pages; pi++) {
      doc.setPage(pi);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(footer, margin, page.h - 26);
    }

    const filename = `${projName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "equity"}-agreement.pdf`;
    doc.save(filename);
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ project }));
    } catch {
      // ignore
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return normalizeImportedProject(parsed);
    } catch {
      return null;
    }
  }

  function resetStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  let project = loadFromStorage() || cloneDefaultProject();
  let pendingFocusPersonId = null;

  const el = {
    metaLine: document.getElementById("metaLine"),
    projectName: document.getElementById("projectName"),
    projectDesc: document.getElementById("projectDesc"),
    currency: document.getElementById("currency"),
    addPersonBtn: document.getElementById("addPersonBtn"),
    peopleList: document.getElementById("peopleList"),
    netProfit: document.getElementById("netProfit"),
    fundingMode: document.getElementById("fundingMode"),
    fundingPane: document.getElementById("fundingPane"),
    financePoolPct: document.getElementById("financePoolPct"),
    financePoolPctLabel: document.getElementById("financePoolPctLabel"),
    workPoolPctLabel: document.getElementById("workPoolPctLabel"),
    financePoolPctPill: document.getElementById("financePoolPctPill"),
    workPoolPctPill: document.getElementById("workPoolPctPill"),
    fundersList: document.getElementById("fundersList"),
    rolesList: document.getElementById("rolesList"),
    resultsPane: document.getElementById("resultsPane"),
    calcStatus: document.getElementById("calcStatus"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    importJsonBtn: document.getElementById("importJsonBtn"),
    exportPdfBtn: document.getElementById("exportPdfBtn"),
    importFile: document.getElementById("importFile"),
    resetBtn: document.getElementById("resetBtn"),
  };

  const ui = {
    roleExamplesOpen: {},
  };

  const tooltipEl = document.createElement("div");
  tooltipEl.className = "tooltip";
  tooltipEl.dataset.show = "false";
  document.body.appendChild(tooltipEl);

  let tooltipPinned = false;
  let tooltipTarget = null;

  function positionTooltip(target) {
    const rect = target.getBoundingClientRect();
    const pad = 10;
    const tipW = Math.min(320, Math.max(220, window.innerWidth * 0.66));
    tooltipEl.style.maxWidth = `${tipW}px`;

    const aboveY = rect.top - pad;
    const belowY = rect.bottom + pad;

    const placeBelow = belowY + 80 < window.innerHeight || aboveY < 120;
    const rawLeft = rect.left + rect.width / 2 - tipW / 2;
    const left = Math.max(10, Math.min(rawLeft, window.innerWidth - tipW - 10));
    const top = placeBelow ? belowY : Math.max(10, rect.top - pad);

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.transform = placeBelow ? "translateY(0)" : "translateY(-100%)";
  }

  function showTooltip(target, pinned = false) {
    const tip = target?.dataset?.tip;
    if (!tip) return;
    tooltipPinned = pinned;
    tooltipTarget = target;
    tooltipEl.textContent = tip;
    tooltipEl.dataset.show = "true";
    positionTooltip(target);
  }

  function hideTooltip(force = false) {
    if (tooltipPinned && !force) return;
    tooltipPinned = false;
    tooltipTarget = null;
    tooltipEl.dataset.show = "false";
  }

  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest(".info[data-tip]");
    if (!t || tooltipPinned) return;
    showTooltip(t, false);
  });

  document.addEventListener("mouseout", (e) => {
    if (tooltipPinned) return;
    const fromInfo = e.target.closest(".info[data-tip]");
    if (!fromInfo) return;
    const to = e.relatedTarget;
    if (to && (to.closest?.(".info[data-tip]") || to === tooltipEl)) return;
    hideTooltip(true);
  });

  document.addEventListener("focusin", (e) => {
    const t = e.target.closest(".info[data-tip]");
    if (!t) return;
    showTooltip(t, false);
  });

  document.addEventListener("focusout", (e) => {
    const t = e.target.closest(".info[data-tip]");
    if (!t) return;
    hideTooltip(true);
  });

  document.addEventListener("click", (e) => {
    const t = e.target.closest(".info[data-tip]");
    if (t) {
      e.preventDefault();
      if (tooltipPinned && tooltipTarget === t) {
        hideTooltip(true);
      } else {
        showTooltip(t, true);
      }
      return;
    }
    hideTooltip(true);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideTooltip(true);
  });

  window.addEventListener(
    "scroll",
    () => {
      if (tooltipTarget) positionTooltip(tooltipTarget);
    },
    true,
  );
  window.addEventListener("resize", () => {
    if (tooltipTarget) positionTooltip(tooltipTarget);
  });

  function syncPools() {
    const iPool = project.financePool.mode === "funded" ? clamp(Number(project.financePool.pct) || 50, 30, 60) : 0;
    project.financePool.pct = iPool || project.financePool.pct;
    project.workPool.pct = 100 - iPool;
  }

  let saveTimer = null;
  function scheduleSave() {
    syncPools();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToStorage, 200);
  }

  function renderAll() {
    syncPools();
    if (document.activeElement !== el.projectName) el.projectName.value = project.name;
    if (document.activeElement !== el.projectDesc) el.projectDesc.value = project.desc;
    if (document.activeElement !== el.currency) el.currency.value = project.currency;
    const calc = runCalc(project);
    renderMeta(calc);
    renderPeople();
    renderFunding(calc);
    renderRoles(calc);
    renderResults(calc);
  }

  function renderComputed() {
    syncPools();
    const calc = runCalc(project);
    renderMeta(calc);
    renderResults(calc);
  }

  function removePersonEverywhere(pid) {
    for (const role of project.roles) {
      const a = project.assignments[role.key];
      if (!a) continue;
      a.members = a.members.filter(m => m.pid !== pid);
    }
    project.financePool.funders = project.financePool.funders.filter(f => f.pid !== pid);
  }

  function addPerson() {
    const id = uid();
    project.participants.push({ id, name: "" });
    pendingFocusPersonId = id;
    scheduleSave();
    renderAll();
  }

  function updatePerson(pid, name) {
    const p = project.participants.find(x => x.id === pid);
    if (!p) return;
    p.name = name;
    scheduleSave();
  }

  function removePerson(pid) {
    project.participants = project.participants.filter(x => x.id !== pid);
    removePersonEverywhere(pid);
    if (!project.participants.length) project.participants = [{ id: uid(), name: "" }];
    scheduleSave();
    renderAll();
  }

  function toggleRole(roleKey, active) {
    const a = project.assignments[roleKey];
    if (!a) return;
    a.active = !!active;
    scheduleSave();
    renderAll();
  }

  function addRoleMember(roleKey, pid) {
    const a = project.assignments[roleKey];
    if (!a) return;
    if (a.members.some(m => m.pid === pid)) return;
    const defaultStatus = a.members.length === 0 ? "lead" : "partner";
    a.members.push({ pid, status: defaultStatus });
    scheduleSave();
    renderAll();
  }

  function removeRoleMember(roleKey, pid) {
    const a = project.assignments[roleKey];
    if (!a) return;
    a.members = a.members.filter(m => m.pid !== pid);
    scheduleSave();
    renderAll();
  }

  function setRoleMemberStatus(roleKey, pid, status) {
    const a = project.assignments[roleKey];
    if (!a) return;
    const m = a.members.find(x => x.pid === pid);
    if (!m) return;
    m.status = STATUS_ORDER.includes(status) ? status : "contributor";
    scheduleSave();
    renderAll();
  }

  function setRoleNotes(roleKey, notes) {
    const a = project.assignments[roleKey];
    if (!a) return;
    a.notes = notes;
    scheduleSave();
  }

  function renderMeta(calc) {
    const named = project.participants.filter(p => (p.name || "").trim()).length;
    const rolesActive = project.roles.filter(r => project.assignments[r.key]?.active).length;
    const msg = `${named} named · ${rolesActive} active roles`;
    el.metaLine.textContent = calc && calc.ok ? `${msg} · total = 100%` : msg;
  }

  function renderPeople() {
    el.peopleList.innerHTML = "";

    const frag = document.createDocumentFragment();
    let focusEl = null;
    for (const p of project.participants) {
      const row = document.createElement("div");
      row.className = "people-row";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Name";
      input.autocomplete = "off";
      input.value = p.name;
      input.addEventListener("input", () => updatePerson(p.id, input.value));
      input.addEventListener("blur", () => renderAll());
      if (p.id === pendingFocusPersonId) focusEl = input;

      const actions = document.createElement("div");
      actions.className = "row";

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn--danger";
      del.textContent = "Remove";
      del.addEventListener("click", () => removePerson(p.id));

      actions.appendChild(del);
      row.appendChild(input);
      row.appendChild(actions);
      frag.appendChild(row);
    }

    el.peopleList.appendChild(frag);
    if (focusEl) {
      pendingFocusPersonId = null;
      setTimeout(() => focusEl.focus(), 0);
    }
  }

  function renderFunding(calc) {
    syncPools();
    if (document.activeElement !== el.netProfit) el.netProfit.value = project.totals.netProfit;
    el.fundingMode.value = project.financePool.mode;
    el.fundingPane.hidden = project.financePool.mode !== "funded";

    const pct = clamp(Number(project.financePool.pct) || 50, 30, 60);
    const iPool = project.financePool.mode === "funded" ? pct : 0;
    const wPool = 100 - iPool;

    el.financePoolPct.value = String(pct);
    el.financePoolPctLabel.textContent = String(pct);
    el.workPoolPctLabel.textContent = String(wPool);
    el.financePoolPctPill.textContent = String(pct);
    el.workPoolPctPill.textContent = String(wPool);

    el.fundersList.innerHTML = "";
    if (project.financePool.mode !== "funded") return;

    const named = project.participants.filter(p => (p.name || "").trim());
    if (!named.length) {
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = "Add collaborators first to enter investments.";
      el.fundersList.appendChild(hint);
      return;
    }

    for (const p of named) {
      const f = project.financePool.funders.find(x => x.pid === p.id);

      const row = document.createElement("div");
      row.className = "chip";

      const head = document.createElement("div");
      head.className = "chip__head";

      const title = document.createElement("div");
      title.className = "chip__title";
      title.textContent = p.name;

      head.appendChild(title);
      row.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "grid2";
      grid.style.marginTop = "10px";

      const amt = document.createElement("div");
      amt.className = "field";
      const amtLabel = document.createElement("label");
      amtLabel.textContent = "Investment amount";
      const amtInput = document.createElement("input");
      amtInput.type = "text";
      amtInput.inputMode = "decimal";
      amtInput.value = String(f?.amount ?? "");
      amtInput.placeholder = "0";
      amt.appendChild(amtLabel);
      amt.appendChild(amtInput);

      const rp = document.createElement("div");
      rp.className = "field";
      const rpLabel = document.createElement("label");
      rpLabel.textContent = "Premium (%)";
      const rpInput = document.createElement("input");
      rpInput.type = "text";
      rpInput.inputMode = "decimal";
      rpInput.value = String(f?.riskPremium ?? "20");
      rpInput.placeholder = "20";
      rpInput.disabled = parseNumber(String(amtInput.value ?? "")) <= 0;
      rp.appendChild(rpLabel);
      rp.appendChild(rpInput);

      grid.appendChild(amt);
      grid.appendChild(rp);
      row.appendChild(grid);

      const note = document.createElement("div");
      note.className = "chip__desc";
      row.appendChild(note);

      const upsert = () => {
        let funder = project.financePool.funders.find(x => x.pid === p.id);
        if (!funder) {
          funder = { pid: p.id, amount: "", riskPremium: "20" };
          project.financePool.funders.push(funder);
        }
        return funder;
      };

      const dropIfEmpty = () => {
        const funder = project.financePool.funders.find(x => x.pid === p.id);
        if (!funder) return;
        if (parseNumber(String(funder.amount ?? "")) <= 0) {
          project.financePool.funders = project.financePool.funders.filter(x => x.pid !== p.id);
        }
      };

      const refreshRecoup = () => {
        const invested = parseNumber(String(amtInput.value ?? ""));
        const premium = parseNumber(String(rpInput.value ?? ""));
        const recoup = invested * (1 + premium / 100);
        if (invested > 0) {
          note.hidden = false;
          note.textContent = `Recoups ${formatMoney(project.currency, recoup)} first (from gross).`;
        } else {
          note.hidden = true;
          note.textContent = "";
        }
      };

      amtInput.addEventListener("input", () => {
        const cleaned = String(amtInput.value).replace(/[^0-9.\-]/g, "");
        amtInput.value = cleaned;
        const invested = parseNumber(cleaned);
        if (invested > 0) {
          const funder = upsert();
          funder.amount = cleaned;
          if (!String(funder.riskPremium || "").trim()) funder.riskPremium = "20";
          rpInput.disabled = false;
        } else {
          const funder = project.financePool.funders.find(x => x.pid === p.id);
          if (funder) funder.amount = cleaned;
          dropIfEmpty();
          rpInput.disabled = true;
        }
        scheduleSave();
        refreshRecoup();
        renderComputed();
      });

      rpInput.addEventListener("input", () => {
        if (rpInput.disabled) return;
        const cleaned = String(rpInput.value).replace(/[^0-9.\-]/g, "");
        rpInput.value = cleaned;
        const funder = upsert();
        funder.riskPremium = cleaned || "0";
        scheduleSave();
        refreshRecoup();
      });

      refreshRecoup();

      el.fundersList.appendChild(row);
    }
  }

  function renderRoles(calc) {
    el.rolesList.innerHTML = "";
    const named = project.participants.filter(p => (p.name || "").trim());

    const validRoles = project.roles.filter(r => project.assignments[r.key]?.active && project.assignments[r.key].members.length > 0);
    const totalPts = validRoles.reduce((s, r) => s + (Number(r.pts) || 0), 0);
    const wPoolPct = calc ? calc.wPoolPct : (project.financePool.mode === "funded" ? 100 - clamp(Number(project.financePool.pct) || 50, 30, 60) : 100);

    const frag = document.createDocumentFragment();
    const grid = document.createElement("div");
    grid.className = "role-grid";

    for (const role of project.roles) {
      const a = project.assignments[role.key];
      if (!a) continue;

      const card = document.createElement("div");
      card.className = `chip roleCard${a.active ? " roleCard--active" : ""}`;

      const head = document.createElement("div");
      head.className = "role-head";

      const activeWrap = document.createElement("div");
      activeWrap.className = "role-head__toggle";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!a.active;
      cb.setAttribute("aria-label", `Activate role: ${role.label}`);
      cb.addEventListener("change", () => toggleRole(role.key, cb.checked));
      activeWrap.appendChild(cb);

      const title = document.createElement("div");
      title.className = "role-head__name";
      title.textContent = role.label;
      const badges = document.createElement("div");
      badges.className = "role-head__badges";
      const pts = Number(role.pts) || 0;
      const poolPct = a.active && a.members.length > 0 && totalPts > 0 ? (pts / totalPts) * wPoolPct : null;

      const ptsBadge = document.createElement("div");
      ptsBadge.className = "roleBadge";
      ptsBadge.appendChild(Object.assign(document.createElement("span"), { textContent: `${pts} pt` }));
      ptsBadge.appendChild(
        infoButton(
          "Role points set this bucket size inside the Work Pool. When only some roles are active, points are normalized across active roles.",
        ),
      );
      badges.appendChild(ptsBadge);

      const poolBadge = document.createElement("div");
      poolBadge.className = "roleBadge";
      poolBadge.appendChild(
        Object.assign(document.createElement("span"), {
          textContent: poolPct == null ? "—" : `${poolPct.toFixed(1)}% of net profit (work)`,
        }),
      );
      poolBadge.appendChild(
        infoButton("This is this role’s net-profit share of the Work Pool: Work Pool × (normalized role points)."),
      );
      badges.appendChild(poolBadge);

      head.appendChild(activeWrap);
      head.appendChild(title);
      head.appendChild(badges);
      card.appendChild(head);

      const body = document.createElement("div");
      body.className = "role-body";

      const desc = document.createElement("div");
      desc.className = "chip__desc";
      desc.textContent = role.desc;
      body.appendChild(desc);

      const exRow = document.createElement("div");
      exRow.className = "roleExamplesRow";
      const exBtn = document.createElement("button");
      exBtn.type = "button";
      exBtn.className = "linkbtn";
      const isOpen = !!ui.roleExamplesOpen[role.key];
      exBtn.textContent = isOpen ? "Hide examples" : "See examples";
      exBtn.addEventListener("click", () => {
        ui.roleExamplesOpen[role.key] = !ui.roleExamplesOpen[role.key];
        renderRoles(runCalc(project));
      });
      exRow.appendChild(exBtn);
      body.appendChild(exRow);

      if (isOpen && Array.isArray(role.examples) && role.examples.length) {
        const ul = document.createElement("ul");
        ul.className = "examplesList";
        for (const ex of role.examples.slice(0, 5)) {
          const li = document.createElement("li");
          li.textContent = ex;
          ul.appendChild(li);
        }
        body.appendChild(ul);
      }

      card.appendChild(body);

      if (a.active) {
        const assign = document.createElement("div");
        assign.className = "role-assign stack-sm";

        if (!named.length) {
          const hint = document.createElement("div");
          hint.className = "hint";
          hint.textContent = "Add named collaborators to assign this role.";
          assign.appendChild(hint);
        } else {
          const list = document.createElement("div");
          list.className = "memberList";

          const headRow = document.createElement("div");
          headRow.className = "memberRow memberRow--head";
          headRow.appendChild(
            Object.assign(document.createElement("div"), { className: "memberRow__name", textContent: "Name" }),
          );
          headRow.appendChild(
            Object.assign(document.createElement("div"), { className: "memberRow__status", textContent: "Status" }),
          );
          headRow.appendChild(
            Object.assign(document.createElement("div"), { className: "memberRow__units", textContent: "Units" }),
          );
          headRow.appendChild(Object.assign(document.createElement("div"), { className: "memberRow__remove" }));
          list.appendChild(headRow);

          for (const m of a.members) {
            const person = project.participants.find(p => p.id === m.pid);
            const row = document.createElement("div");
            row.className = "memberRow";

            const nameCell = document.createElement("div");
            nameCell.className = "memberRow__name";
            nameCell.textContent = person ? (person.name || "—") : "—";

            const statusCell = document.createElement("div");
            statusCell.className = "memberRow__status";
            const sel = document.createElement("select");
            for (const st of STATUS_ORDER) {
              const opt = document.createElement("option");
              opt.value = st;
              opt.textContent = STATUS_LABELS[st];
              sel.appendChild(opt);
            }
            sel.value = m.status;
            sel.addEventListener("change", () => setRoleMemberStatus(role.key, m.pid, sel.value));
            statusCell.appendChild(sel);

            const unitsCell = document.createElement("div");
            unitsCell.className = "memberRow__units";
            const ub = document.createElement("span");
            ub.className = "unitsBadge";
            ub.textContent = String(STATUS_UNITS[m.status] || 0);
            unitsCell.appendChild(ub);

            const delCell = document.createElement("div");
            delCell.className = "memberRow__remove";
            const del = document.createElement("button");
            del.type = "button";
            del.className = "btn btn--danger";
            del.textContent = "×";
            del.title = "Remove from role";
            del.addEventListener("click", () => removeRoleMember(role.key, m.pid));
            delCell.appendChild(del);

            row.appendChild(nameCell);
            row.appendChild(statusCell);
            row.appendChild(unitsCell);
            row.appendChild(delCell);
            list.appendChild(row);
          }
          assign.appendChild(list);

          const unassigned = named.filter(p => !a.members.some(m => m.pid === p.id));
          const addRow = document.createElement("div");
          addRow.className = "row row--wrap roleAddRow";

          const pick = document.createElement("select");
          pick.className = "roleAddSelect";
          const opt0 = document.createElement("option");
          opt0.value = "";
          opt0.textContent = unassigned.length ? "Add collaborator…" : "All assigned";
          pick.appendChild(opt0);
          for (const p of unassigned) {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name;
            pick.appendChild(opt);
          }
          pick.disabled = !unassigned.length;
          pick.addEventListener("change", () => {
            if (!pick.value) return;
            addRoleMember(role.key, pick.value);
          });

          addRow.appendChild(pick);
          assign.appendChild(addRow);

          const notes = document.createElement("div");
          notes.className = "field";
          const notesLabel = document.createElement("label");
          notesLabel.textContent = "Notes (optional)";
          const notesInput = document.createElement("input");
          notesInput.type = "text";
          notesInput.value = a.notes || "";
          notesInput.placeholder = "Short note for agreement";
          notesInput.addEventListener("input", () => setRoleNotes(role.key, notesInput.value));
          notes.appendChild(notesLabel);
          notes.appendChild(notesInput);
          assign.appendChild(notes);
        }

        card.appendChild(assign);
      }

      grid.appendChild(card);
    }

    frag.appendChild(grid);
    el.rolesList.appendChild(frag);
  }

  function renderResults(calc) {
    el.resultsPane.innerHTML = "";

    const summary = document.createElement("div");
    summary.className = "row row--wrap row--spread";
    const pills = document.createElement("div");
    pills.className = "row row--wrap";
    pills.appendChild(badge("Work Pool", `${calc.wPoolPct}%`));
    pills.appendChild(badge("Finance Pool", `${calc.iPoolPct}%`));
    if (calc.ok) pills.appendChild(badge("Total", `${calc.sumPct.toFixed(2)}%`));
    summary.appendChild(pills);
    summary.appendChild(
      infoButton(
        "Work Pool splits by role buckets. Only active roles count, and their points are normalized so Work always totals 100%. Inside a role, shares split by status units (Lead 3, Partner 2, Contributor 1). Finance Pool splits pro‑rata by investment.",
      ),
    );
    el.resultsPane.appendChild(summary);

    if (!calc.ok) {
      const list = document.createElement("div");
      list.className = "stack-sm";

      const main = document.createElement("div");
      main.className = "hint";
      main.textContent = calc.issues.length ? calc.issues[0] : "Complete inputs to see results.";
      list.appendChild(main);

      if (calc.issues.length > 1) {
        const ul = document.createElement("ul");
        ul.className = "hint";
        ul.style.margin = "0";
        ul.style.paddingLeft = "18px";
        for (const issue of calc.issues.slice(1)) {
          const li = document.createElement("li");
          li.textContent = issue;
          ul.appendChild(li);
        }
        list.appendChild(ul);
      }

      el.calcStatus.textContent = "Not ready";
      el.resultsPane.appendChild(list);
      return;
    }

    el.calcStatus.textContent = "Ready";

    const currency = project.currency;
    const netProfit = parseNumber(project.totals.netProfit);

    const cards = document.createElement("div");
    cards.className = "resultsCards";
    for (const p of calc.people) {
      const card = document.createElement("div");
      card.className = "resultCard";

      const name = document.createElement("div");
      name.className = "resultCard__name";
      name.textContent = p.name;
      card.appendChild(name);

      const grid = document.createElement("div");
      grid.className = "resultCard__grid";

      const payout = (netProfit * p.totalProfitPct) / 100;
      const items = [
        ["Total %", `${p.totalProfitPct.toFixed(2)}%`],
        ["Work %", `${p.workPoolContribPct.toFixed(2)}%`],
        ["Finance %", `${p.finPoolContribPct.toFixed(2)}%`],
        ["Payout", formatMoney(currency, payout)],
      ];
      for (const [k, v] of items) {
        const kk = document.createElement("div");
        kk.className = "resultCard__k";
        kk.textContent = k;
        const vv = document.createElement("div");
        vv.className = "resultCard__v";
        vv.textContent = v;
        grid.appendChild(kk);
        grid.appendChild(vv);
      }
      card.appendChild(grid);
      cards.appendChild(card);
    }
    el.resultsPane.appendChild(cards);

    const tableEl = document.createElement("table");
    tableEl.className = "table";
    const thead = document.createElement("thead");
    thead.innerHTML =
      "<tr><th>Participant</th><th class=\"num\">Total %</th><th class=\"num\">Work %</th><th class=\"num\">Finance %</th><th class=\"num\">Payout</th></tr>";
    tableEl.appendChild(thead);
    const tbody = document.createElement("tbody");

    for (const p of calc.people) {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = p.name;

      const tdTotal = document.createElement("td");
      tdTotal.className = "num";
      tdTotal.textContent = `${p.totalProfitPct.toFixed(2)}%`;

      const tdWork = document.createElement("td");
      tdWork.className = "num";
      tdWork.textContent = `${p.workPoolContribPct.toFixed(2)}%`;

      const tdFin = document.createElement("td");
      tdFin.className = "num";
      tdFin.textContent = `${p.finPoolContribPct.toFixed(2)}%`;

      const tdPay = document.createElement("td");
      tdPay.className = "num";
      const payout = (netProfit * p.totalProfitPct) / 100;
      tdPay.textContent = formatMoney(currency, payout);

      tr.appendChild(tdName);
      tr.appendChild(tdTotal);
      tr.appendChild(tdWork);
      tr.appendChild(tdFin);
      tr.appendChild(tdPay);
      tbody.appendChild(tr);
    }
    tableEl.appendChild(tbody);
    const tableWrap = document.createElement("div");
    tableWrap.className = "table-wrap resultsTable";
    tableWrap.appendChild(tableEl);
    el.resultsPane.appendChild(tableWrap);

    if (project.financePool.mode === "funded" && calc.totalFunded > 0) {
      const fin = document.createElement("div");
      fin.className = "hint";
      fin.textContent = `Total funded: ${formatMoney(currency, calc.totalFunded)}. Finance Pool splits by investment amount (pro-rata).`;
      el.resultsPane.appendChild(fin);
    }
  }

  function badge(k, v) {
    const b = document.createElement("span");
    b.className = "badge";
    const kk = document.createElement("span");
    kk.textContent = k;
    kk.style.color = "#666";
    const vv = document.createElement("strong");
    vv.textContent = v;
    b.appendChild(kk);
    b.appendChild(vv);
    return b;
  }

  function infoButton(tip) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "info";
    b.setAttribute("aria-label", "Info");
    b.dataset.tip = tip;
    b.textContent = "i";
    return b;
  }

  el.projectName.addEventListener("input", () => {
    project.name = el.projectName.value;
    scheduleSave();
  });

  el.projectDesc.addEventListener("input", () => {
    project.desc = el.projectDesc.value;
    scheduleSave();
  });

  el.currency.addEventListener("change", () => {
    project.currency = el.currency.value;
    scheduleSave();
    renderAll();
  });

  el.addPersonBtn.addEventListener("click", addPerson);

  el.netProfit.addEventListener("input", () => {
    project.totals.netProfit = el.netProfit.value.replace(/[^0-9.\-]/g, "");
    scheduleSave();
    renderComputed();
  });

  el.fundingMode.addEventListener("change", () => {
    project.financePool.mode = el.fundingMode.value === "funded" ? "funded" : "none";
    scheduleSave();
    renderAll();
  });

  el.financePoolPct.addEventListener("input", () => {
    project.financePool.pct = clamp(Number(el.financePoolPct.value) || 50, 30, 60);
    scheduleSave();
    const pct = clamp(Number(project.financePool.pct) || 50, 30, 60);
    const wPool = 100 - pct;
    el.financePoolPctLabel.textContent = String(pct);
    el.workPoolPctLabel.textContent = String(wPool);
    el.financePoolPctPill.textContent = String(pct);
    el.workPoolPctPill.textContent = String(wPool);
    renderComputed();
  });
  el.financePoolPct.addEventListener("change", renderAll);

  el.exportJsonBtn.addEventListener("click", exportProjectJson);
  el.importJsonBtn.addEventListener("click", () => el.importFile.click());
  el.importFile.addEventListener("change", () => {
    const file = el.importFile.files && el.importFile.files[0];
    el.importFile.value = "";
    if (file) importProjectJson(file);
  });

  el.exportPdfBtn.addEventListener("click", exportAgreementPdf);
  el.resetBtn.addEventListener("click", () => {
    if (!confirm("Reset this tool? This clears local autosave.")) return;
    resetStorage();
    project = cloneDefaultProject();
    saveToStorage();
    renderAll();
  });

  renderAll();
})();
