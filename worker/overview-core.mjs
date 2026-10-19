// Founder overview data: reads every app through the EXP agent gateway (read-only) and
// Cloudflare analytics, and returns the slim object the overview page renders.
// Runs in Node (prototypes/founder-dashboard/snapshot.mjs) and in the Dash Worker
// Source of truth: exp-agent-gateway prototypes/founder-dashboard/overview-core.mjs (keep in sync).

const API = 'https://api.cloudflare.com/client/v4';

export async function fetchTraffic(token, zoneName = 'houseofexp.com', days = 90) {
  if (!token) return { error: 'CLOUDFLARE_API_TOKEN not set' };
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const zones = await (await fetch(`${API}/zones?name=${encodeURIComponent(zoneName)}`, { headers })).json();
  const zone = zones?.result?.[0]?.id;
  if (!zone) return { error: `zone ${zoneName} not visible to this token` };
  const until = new Date().toISOString().slice(0, 10);
  const query = `query($zone: String!, $since: Date!, $until: Date!) { viewer { zones(filter: { zoneTag: $zone }) {
    httpRequests1dGroups(limit: 400, filter: { date_geq: $since, date_leq: $until }, orderBy: [date_ASC]) {
      dimensions { date }
      sum { requests pageViews bytes threats cachedRequests countryMap { clientCountryName requests } }
      uniq { uniques }
    } } } }`;
  for (const span of [days, 30, 7]) {
    const since = new Date(Date.now() - (span - 1) * 864e5).toISOString().slice(0, 10);
    const res = await (await fetch(`${API}/graphql`, { method: 'POST', headers, body: JSON.stringify({ query, variables: { zone, since, until } }) })).json();
    const rows = res?.data?.viewer?.zones?.[0]?.httpRequests1dGroups;
    if (!rows) { if (span === 7) return { error: res?.errors?.[0]?.message ?? 'analytics query failed' }; continue; }
    const countries = {};
    for (const r of rows) for (const c of r.sum.countryMap ?? []) countries[c.clientCountryName] = (countries[c.clientCountryName] ?? 0) + c.requests;
    return {
      zone: zoneName,
      days: rows.map((r) => ({ date: r.dimensions.date, requests: r.sum.requests, pageViews: r.sum.pageViews, uniques: r.uniq.uniques, bytes: r.sum.bytes, threats: r.sum.threats, cached: r.sum.cachedRequests })),
      countries: Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })),
    };
  }
  return { error: 'analytics query failed' };
}

// Where houseofexp.com visitors come from, from Cloudflare Web Analytics (browser beacon).
const SOURCE_RULES = [
  ['Instagram', /(^|\.)instagram\.com$|^l\.instagram\.com$/],
  ['Google', /(^|\.)google\.[a-z.]+$|^googleads|^news\.google/],
  ['Facebook', /(^|\.)(facebook\.com|fb\.com|fb\.me)$/],
  ['TikTok', /(^|\.)tiktok\.com$/],
  ['YouTube', /(^|\.)(youtube\.com|youtu\.be)$/],
  ['WhatsApp', /(^|\.)(whatsapp\.com|wa\.me)$/],
  ['X / Twitter', /(^|\.)(twitter\.com|x\.com|t\.co)$/],
  ['LinkedIn', /(^|\.)(linkedin\.com|lnkd\.in)$/],
  ['Bing', /(^|\.)bing\.com$/],
];
export function visitorSource(host) {
  if (!host) return 'Direct';
  for (const [label, rule] of SOURCE_RULES) if (rule.test(host)) return label;
  return 'Other sites';
}

export async function fetchVisitorSources(token, accountId, site = 'houseofexp.com', days = 30) {
  if (!token) return { error: 'analytics token not set' };
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const query = `query($a: String!, $s: Time!, $h: String!) { viewer { accounts(filter: { accountTag: $a }) {
    rumPageloadEventsAdaptiveGroups(limit: 100, filter: { datetime_geq: $s, requestHost: $h }, orderBy: [count_DESC]) { count dimensions { refererHost } }
  } } }`;
  const res = await (await fetch(`${API}/graphql`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ query, variables: { a: accountId, s: since, h: site } }) })).json();
  const rows = res?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups;
  if (!rows) return { error: res?.errors?.[0]?.message ?? 'web analytics query failed' };
  const own = new RegExp(`(^|\\.)${site.replace(/\./g, '\\.')}$`);
  const groups = {}; const hosts = {};
  for (const r of rows) {
    const host = (r.dimensions.refererHost ?? '').toLowerCase();
    if (own.test(host)) continue; // internal navigation, not an arrival
    const label = visitorSource(host);
    groups[label] = (groups[label] ?? 0) + r.count;
    if (host) hosts[host] = (hosts[host] ?? 0) + r.count;
  }
  return {
    days,
    total: Object.values(groups).reduce((t, n) => t + n, 0),
    sources: Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
    hosts: Object.entries(hosts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value })),
  };
}

export async function buildOverview({ origin, token, analyticsToken, accountId = '9c6dc8ad66dcb29f5b83f8c3b411d6ea' }) {
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const calls = {
    // Journal
    journal: ['journal', 'reportDashboard.dashboard'],
    ar: ['journal', 'invoices.arAging'],
    ap: ['journal', 'bills.apAging'],
    invoices: ['journal', 'invoices.list'],
    quotations: ['journal', 'quotations.list'],
    bank: ['journal', 'bankStatements.list'],
    parties: ['journal', 'parties.list'],
    pnl: ['journal', 'financialReports.labaRugi'],
    // CRM
    deals: ['crm', 'deals.list'],
    leads: ['crm', 'leads.list'],
    crmTasks: ['crm', 'tasks.list'],
    clients: ['crm', 'clients.list'],
    // StudioStaff
    studioProjects: ['studiostaff', 'projects.list'],
    studioTasks: ['studiostaff', 'tasks.list'],
    studioMilestones: ['studiostaff', 'milestones.list'],
    reimbursements: ['studiostaff', 'reimbursements.list'],
    leave: ['studiostaff', 'domestic_leave.list'],
    audit: ['studiostaff', 'audit.list'],
    // Research
    research: ['research', 'today'],
    researchProjects: ['research', 'projects.summary'],
    researchInvoices: ['research', 'invoices.list'],
    researchQuotes: ['research', 'quotes.list'],
    researchMonitor: ['research', 'monitor.get'],
    researchJournal: ['research', 'journal.list'],
    researchActivity: ['research', 'activity.list'],
    // Academy
    academy: ['academy', 'summary'],
    courses: ['academy', 'courses.list'],
    sessions: ['academy', 'sessions.list'],
    // NAH
    nah: ['nah', 'summary'],
    bookings: ['nah', 'bookings.list'],
    campaigns: ['nah', 'campaigns.list'],
    equipment: ['nah', 'equipment.list'],
    products: ['nah', 'products.list'],
    sales: ['nah', 'sales.list'],
    // Others
    portal: ['portal', 'summary'],
    portalProjects: ['portal', 'projects.list'],
    downloads: ['portal', 'downloads.list'],
    assets: ['assets', 'assets.list'],
    planning: ['command-center', 'planning.list'],
    media: ['admin', 'media.list'],
  };

  const trafficPromise = fetchTraffic(analyticsToken).catch((error) => ({ error: String(error.message ?? error) }));
  const sourcesPromise = fetchVisitorSources(analyticsToken, accountId).catch((error) => ({ error: String(error.message ?? error) }));
  // Reads that may not be deployed yet; a failure leaves the card empty without marking the app down.
  const optional = new Set(['downloads']);
  const health = {};
  const raw = {};
  await Promise.all(Object.entries(calls).map(async ([key, [app, operation]]) => {
    const started = Date.now();
    health[app] ??= { ok: true, ms: 0 };
    try {
      const call = () => fetch(`${origin}/v1/execute`, { method: 'POST', headers, body: JSON.stringify({ app, operation, args: {} }) });
      const res = await call().catch(() => call()); // one retry when the connection drops
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      raw[key] = body.data;
    } catch (error) {
      if (!optional.has(key)) health[app] = { ...health[app], ok: false, error: `${operation}: ${String(error.message ?? error)}` };
    }
    health[app].ms = Math.max(health[app].ms, Date.now() - started);
  }));

  const unwrap = (value) => value?.result ?? value?.data ?? value;
  const list = (key) => { const v = unwrap(raw[key]); return Array.isArray(v) ? v : []; };
  const sum = (items, fn) => items.reduce((total, item) => total + (Number(fn(item)) || 0), 0);
  const group = (items, fn, valueFn) => Object.entries(items.reduce((acc, item) => {
    const key = fn(item) ?? 'Unknown';
    const entry = acc[key] ?? { count: 0, value: 0 };
    entry.count += 1;
    entry.value += valueFn ? Number(valueFn(item)) || 0 : 0;
    acc[key] = entry;
    return acc;
  }, {})).map(([label, { count, value }]) => ({ label, count, value })).sort((a, b) => b.count - a.count || b.value - a.value);
  const today = new Date().toISOString().slice(0, 10);

  const j = raw.journal;
  const deals = raw.deals?.items ?? [];
  const studioTasks = list('studioTasks');
  const research = unwrap(raw.research);
  const researchProjects = unwrap(raw.researchProjects);
  const fund = research?.fund;
  const academy = raw.academy;
  const nah = raw.nah;
  const assets = (Array.isArray(raw.assets) ? raw.assets : []).filter((asset) => !asset.archived);
  const planning = raw.planning?.records ?? [];
  const invoices = Array.isArray(raw.invoices) ? raw.invoices : [];
  const bankLines = Array.isArray(raw.bank) ? raw.bank : [];
  const sales = raw.sales?.sales ?? [];
  const variants = raw.products?.variants ?? [];
  const equipment = raw.equipment?.equipment ?? [];
  const bookings = raw.bookings?.bookings ?? [];
  const media = raw.media?.items ?? [];
  const reimbursements = list('reimbursements');
  const audit = list('audit');
  const researchActivityAll = list('researchActivity');
  const researchActivity = researchActivityAll.filter((item) => !/^monitor/i.test(item.summary ?? ''));
  const mix = (items = []) => items.slice(0, 6).map(({ label, amount, share }) => ({ label, value: amount, share }));

  const parties = Object.fromEntries((Array.isArray(raw.parties) ? raw.parties : []).map((p) => [p._id, p.name]));
  const studioProjects = list('studioProjects');
  const milestones = list('studioMilestones');
  const projectName = Object.fromEntries(studioProjects.map((p) => [p.id, p.name]));
  const portalProjects = list('portalProjects');
  const isPublicCover = (url) => typeof url === 'string' && /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//.test(url);
  const deals2 = raw.deals?.items ?? [];
  const planned = (raw.planning?.records ?? []).filter((r) => r.status === 'approved');

  const data = {
    generatedAt: new Date().toISOString(),
    source: origin,
    health,
    finance: j && {
      period: j.period,
      anchorPeriod: j.anchorPeriod,
      metrics: j.metrics,
      series: j.series.map(({ period, revenue, expense, net, cash }) => ({ period, revenue, expense, net, cash })),
      balances: j.controls.cashBalances.map(({ code, name, balance, negative }) => ({ code, name, balance, negative })),
      draftCount: j.summary.draftCount,
      ar: raw.ar,
      ap: raw.ap,
      ledger: j.ledger,
      position: j.position,
      revenueMix: mix(j.mix?.revenue?.items),
      expenseMix: mix(j.mix?.expense?.items),
      recent: j.recentTransactions.map(({ date, description, primaryAccountName, totalDebit, status }) => ({ date, description, account: primaryAccountName, amount: totalDebit, status })),
      invoices: group(invoices, (i) => i.status, (i) => i.total),
      invoiceOutstanding: sum(invoices.filter((i) => i.status !== 'void'), (i) => i.balanceDue),
      quotations: group(Array.isArray(raw.quotations) ? raw.quotations : [], (q) => q.status, (q) => q.total),
      bank: {
        status: group(bankLines, (l) => l.status),
        moneyIn: sum(bankLines.filter((l) => l.direction === 'in'), (l) => l.amount),
        moneyOut: sum(bankLines.filter((l) => l.direction === 'out'), (l) => l.amount),
      },
      parties: group(Array.isArray(raw.parties) ? raw.parties : [], (p) => p.type),
      pnl: raw.pnl && {
        period: raw.pnl.period,
        income: raw.pnl.totalIncome,
        expense: raw.pnl.totalExpense,
        net: raw.pnl.net,
        incomeLines: raw.pnl.income.map(({ name, amount }) => ({ label: name, value: amount })).sort((a, b) => b.value - a.value),
        expenseLines: raw.pnl.expense.map(({ name, amount }) => ({ label: name, value: amount })).sort((a, b) => b.value - a.value),
      },
    },
    pipeline: {
      stages: group(deals, (deal) => deal.stage, (deal) => deal.value_idr),
      openLeads: (raw.leads?.items ?? []).filter((lead) => !['converted', 'lost', 'closed'].includes(lead.status)).length,
      leadStatus: group(raw.leads?.items ?? [], (lead) => lead.status),
      leadSource: group(raw.leads?.items ?? [], (lead) => lead.source),
      tasksDue: (raw.crmTasks?.items ?? []).filter((task) => !task.done && task.due_date <= today).length,
      clients: raw.clients?.total ?? (raw.clients?.items ?? []).length,
      clientTypes: group(raw.clients?.items ?? [], (c) => (c.type ?? 'Unspecified').split(',')[0].trim()).slice(0, 6),
      topClients: (raw.clients?.items ?? []).filter((c) => c.project_count).sort((a, b) => b.project_count - a.project_count).slice(0, 5).map((c) => ({ label: c.name, count: c.project_count })),
    },
    delivery: {
      studioProjects: list('studioProjects').length,
      studioTasksOpen: studioTasks.filter((task) => task.status !== 'done').length,
      studioTasksOverdue: studioTasks.filter((task) => task.status !== 'done' && task.due && task.due < today).length,
      studioTaskStatus: group(studioTasks, (task) => task.status),
      studioTaskAssignee: group(studioTasks.filter((task) => task.status !== 'done'), (task) => task.assignee).slice(0, 5),
      studioMilestones: group(list('studioMilestones'), (m) => m.status),
      reimbursements: group(reimbursements, (r) => r.status, (r) => r.amount),
      leave: group(list('leave'), (l) => l.status),
      auditByMember: group(audit, (a) => a.member),
      auditRecent: audit.slice(0, 6).map(({ member, action, created_at }) => ({ member, action, at: created_at })),
      researchActive: research?.projects?.active,
      researchDueThisWeek: research?.projects?.due_this_week,
      researchContract: researchProjects?.contract_total,
      researchCollected: researchProjects?.collected_total,
      researchRemaining: researchProjects?.remaining_total,
      researchUnbilled: researchProjects?.unbilled_total,
      receivableOverdue: research?.receivable?.overdue,
      researchInvoices: group(list('researchInvoices'), (i) => i.status, (i) => i.amount),
      researchQuotes: group(list('researchQuotes'), (q) => q.status, (q) => q.value),
      monitor: list('researchMonitor').map(({ title, status, headline }) => ({ title, status, headline })),
      researchCash: unwrap(raw.researchJournal)?.totals,
      researchActivity: researchActivity.slice(0, 6).map(({ actor, summary, created_at }) => ({ actor, summary, at: created_at })),
      fund: fund && { status: fund.status, margin: fund.margin, coverage: fund.coverage, reserveMonths: fund.reserve_months },
      milestones: (research?.milestones ?? []).map(({ title, project, due, status, progress }) => ({ title, project, due, status, progress })),
      portalProjects: group(list('portalProjects'), (p) => p.status),
    },
    academy: academy && {
      month: academy.month,
      revenue: academy.revenue_month_idr,
      target: academy.revenue_target,
      outstanding: academy.outstanding_idr,
      billed: academy.billed_idr,
      collected: academy.collected_idr,
      honorarium: academy.honorarium_month_idr,
      activeStudents: academy.active_students,
      totalStudents: academy.total_students,
      runningCohorts: academy.running_cohorts,
      openCohorts: academy.open_cohorts,
      courses: group(raw.courses?.courses ?? [], (c) => c.track, (c) => c.price_idr),
      sessions: group(raw.sessions?.sessions ?? [], (s) => s.status),
    },
    nah: nah && {
      revenueMtd: nah.rental.revenueMtdIdr,
      activeBookings: nah.rental.activeBookings,
      next7: nah.rental.next7.confirmed,
      liveCampaigns: nah.campaigns.live,
      stockValue: nah.merch.stockValueIdr,
      lowStock: nah.merch.lowStockCount,
      bookings: group(bookings, (b) => b.status),
      equipmentCategory: group(equipment, (e) => e.category),
      equipmentStatus: group(equipment, (e) => e.status),
      dayRateTotal: sum(equipment.filter((e) => e.status === 'available'), (e) => e.day_rate_idr),
      salesTotal: sum(sales, (s) => s.total_idr),
      salesMethod: group(sales, (s) => s.payment_method, (s) => s.total_idr),
      recentSales: sales.slice(0, 5).map(({ receipt_no, customer, total_idr, payment_method, sold_at }) => ({ receipt: receipt_no, customer, total: total_idr, method: payment_method, at: sold_at })),
      lowStockItems: variants.filter((v) => v.low).slice(0, 6).map(({ product_name, variant_name, on_hand, low_stock_threshold }) => ({ name: `${product_name}${variant_name ? ` · ${variant_name}` : ''}`, onHand: on_hand, threshold: low_stock_threshold })),
      unitsOnHand: sum(variants, (v) => v.on_hand),
      variants: variants.length,
      movers: nah.analysis.merchMovers,
      // Same value-weighted rule as NAH's summary (feat/value-utilization), computed here so
      // the dashboard is right before that NAH change is deployed.
      ...(() => {
        const rate = Object.fromEntries(equipment.filter((e) => e.status !== 'retired').map((e) => [e.id, e.day_rate_idr]));
        const capacity = Object.values(rate).reduce((t, r) => t + r, 0);
        const spans = bookings.filter((b) => ['confirmed', 'out', 'returned', 'closed'].includes(b.status))
          .flatMap((b) => (b.items ?? []).filter((i) => rate[i.equipment_item_id] != null).map((i) => ({ id: i.equipment_item_id, rate: rate[i.equipment_item_id], start: String(b.starts_at).slice(0, 10), end: String(b.ends_at).slice(0, 10) })));
        const add = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
        const pct = (from, to) => {
          const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);
          if (!capacity || days <= 0) return 0;
          const out = new Map();
          for (const s of spans) for (let d = s.start > from ? s.start : from; d < (s.end < to ? s.end : to); d = add(d, 1)) out.set(`${s.id}:${d}`, s.rate);
          return Math.round([...out.values()].reduce((t, r) => t + r, 0) / (capacity * days) * 100);
        };
        const elapsedEnd = add(today, 1);
        const saturday = add(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 1) % 7));
        return {
          utilization: pct(`${today.slice(0, 7)}-01`, elapsedEnd),
          weekends: [3, 2, 1, 0].map((k) => { const start = add(saturday, -7 * k), end = add(start, 2); return { weekend_start: start, pct: pct(start, end < elapsedEnd ? end : elapsedEnd) }; }),
        };
      })(),
      mostRented: Object.values(bookings.filter((b) => b.status !== 'cancelled').flatMap((b) => (b.items ?? []).map((i) => ({ name: String(i.name).replace(/\s*#\d+$/, ''), rate: i.rate_snapshot_idr ?? 0, booking: b.id })))
        .reduce((acc, i) => { const g = acc[i.name] ?? { label: i.name, count: 0, value: 0, bookings: new Set() }; if (!g.bookings.has(i.booking)) { g.bookings.add(i.booking); g.count += 1; } g.value += i.rate; acc[i.name] = g; return acc; }, {}))
        .map(({ label, count, value }) => ({ label, count, value })).sort((a, b) => b.count - a.count || b.value - a.value).slice(0, 6),
    },
    portal: unwrap(raw.portal),
    assets: {
      count: assets.length,
      value: sum(assets, (asset) => asset.price * (asset.quantity || 1)),
      byCondition: Object.fromEntries(group(assets, (asset) => asset.condition || 'Unknown').map((g) => [g.label, g.count])),
      division: group(assets, (asset) => asset.division, (asset) => asset.price * (asset.quantity || 1)),
      category: group(assets, (asset) => asset.category, (asset) => asset.price * (asset.quantity || 1)).slice(0, 6),
      top: assets.slice().sort((a, b) => b.price * (b.quantity || 1) - a.price * (a.quantity || 1)).slice(0, 5).map((a) => ({ name: a.name, division: a.division, value: a.price * (a.quantity || 1) })),
    },
    planning: Object.fromEntries(group(planning, (record) => record.status).map((g) => [g.label, g.count])),
    planningKinds: group(planning, (record) => record.kind, (record) => record.amount),
    website: {
      media: group(media, (m) => m.kind, (m) => m.sizeBytes),
      total: raw.media?.total ?? media.length,
      bytes: sum(media, (m) => m.sizeBytes),
    },
    portalFeed: {
      downloads: Array.isArray(unwrap(raw.downloads)) ? unwrap(raw.downloads).slice(0, 10).map(({ client_username, project_id, filename, created_at }) => ({
        client: client_username, file: filename, at: created_at,
        project: portalProjects.find((p) => String(p.project_id) === String(project_id) || String(p.id) === String(project_id))?.title ?? project_id,
        cover: (() => { const p = portalProjects.find((x) => String(x.project_id) === String(project_id) || String(x.id) === String(project_id)); return isPublicCover(p?.cover_url) ? p.cover_url : null; })(),
      })) : null,
      projects: portalProjects.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 12).map((p) => ({
        title: p.title, client: p.client_label ?? p.client_username, status: p.status, created: p.created_at,
        cover: isPublicCover(p.cover_url) ? p.cover_url : null,
        files: (p.files ?? []).filter((f) => ['audio', 'video', 'file'].includes(f.type)).length,
        lastUpload: (p.files ?? []).map((f) => f.uploadedAt).filter(Boolean).sort().at(-1) ?? null,
      })),
      uploads: portalProjects.flatMap((p) => (p.files ?? []).filter((f) => f.uploadedAt && ['audio', 'video', 'file'].includes(f.type)).map((f) => ({
        name: f.name, type: f.type, at: f.uploadedAt, bytes: f.sizeBytes ?? null, project: p.title, cover: isPublicCover(p.cover_url) ? p.cover_url : null,
      }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10),
    },
    studio: {
      reimbursementsPending: reimbursements.filter((r) => r.status === 'pending').map(({ member, reimb_date, amount, description }) => ({ member, date: reimb_date, amount, description })),
      leave: list('leave').map(({ member, from_date, to_date, reason, status }) => ({ member, from: from_date, to: to_date, reason, status })).sort((a, b) => b.from.localeCompare(a.from)),
      revisions: [
        ...milestones.filter((m) => !m.done && (m.status === 'review' || m.revisi > 0)).map((m) => ({ title: m.title, project: projectName[m.project_id] ?? '', who: m.assignee, due: m.due, kind: m.revisi ? `Revisi ${m.revisi}` : 'In review' })),
        ...studioTasks.filter((t) => t.status !== 'done' && /revisi|revision|adjust|feedback|fix|koreksi/i.test(t.title)).map((t) => ({ title: t.title, project: '', who: t.assignee, due: t.due, kind: 'Task' })),
      ],
      projects: studioProjects.map((p) => {
        const ms = milestones.filter((m) => m.project_id === p.id);
        return { name: p.name, client: p.client, code: p.code, milestones: ms.length, done: ms.filter((m) => m.status === 'done' || m.done).length, review: ms.filter((m) => m.status === 'review').length };
      }).filter((p) => p.milestones === 0 || p.done < p.milestones).sort((a, b) => (b.milestones - b.done) - (a.milestones - a.done)),
    },
    // Same rule as CRM's Proyek tracker: won deals closed this year, credited to brought_by.
    crmNetwork: (() => {
      const year = new Date().getFullYear();
      const won = deals2.filter((d) => d.stage === 'won' && d.closed_at && new Date(d.closed_at).getFullYear() === year);
      const roster = [['aldi', 'Aldi'], ['dissa', 'Dissa'], ['bil', 'Bil'], ['ekky', 'Ekky'], ['zaki', 'Zaki'], ['dikuy', 'Dikuy']];
      const rows = roster.map(([key, label]) => { const g = won.filter((d) => d.brought_by === key); return { key, label, count: g.length, value: sum(g, (d) => d.value_idr) }; });
      const loose = won.filter((d) => !roster.some(([key]) => key === d.brought_by));
      if (loose.length) rows.push({ key: 'unattributed', label: 'Belum diatur', count: loose.length, value: sum(loose, (d) => d.value_idr) });
      return { year, rows, count: won.length, value: sum(won, (d) => d.value_idr) };
    })(),
    leads: (raw.leads?.items ?? []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8).map(({ name, source, status, owner, created_at }) => ({ name, source, status, owner, at: created_at })),
    schedule: {
      campaigns: (raw.campaigns?.campaigns ?? []).filter((c) => (c.ends_on ?? c.starts_on) >= today && c.status !== 'cancelled').sort((a, b) => a.starts_on.localeCompare(b.starts_on)).map(({ title, kind, starts_on, ends_on, status }) => ({ title, kind, start: starts_on, end: ends_on, status })),
      bookings: bookings.filter((b) => String(b.starts_at).slice(0, 10) >= today && b.status !== 'cancelled').sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at))).map(({ client_name, status, starts_at, ends_at, total_idr }) => ({ client: client_name, status, start: starts_at, end: ends_at, total: total_idr })),
    },
    cashPlan: {
      overheads: planned.filter((r) => r.kind === 'overhead').map((r) => ({ title: r.title, amount: r.payload.amount ?? r.amount, frequency: r.payload.frequency, dayOfMonth: r.payload.dayOfMonth, startMonth: r.payload.startMonth })),
      goals: (raw.planning?.records ?? []).filter((r) => r.kind === 'goal' && r.status === 'approved').map((r) => ({ title: r.title, target: r.payload.target, saved: sum(r.payload.contributions ?? [], (c) => c.amount), due: r.payload.dueDate })),
      payments: planned.filter((r) => r.kind === 'proposal' && r.payload.paymentDate).map((r) => ({ title: r.title, amount: r.amount, date: r.payload.paymentDate })),
      receivables: invoices.filter((i) => ['sent', 'partial'].includes(i.status) && i.balanceDue > 0).map((i) => ({ number: i.number, party: parties[i.partyId] ?? '', due: i.dueDate, amount: i.balanceDue })),
    },
    // houseofexp.com as reported by Research's monitor (last 24 hours, hourly).
    siteMonitor: (() => {
      const site = list('researchMonitor').find((m) => m.source === 'site-houseofexp-com');
      if (!site) return null;
      const metric = (label) => site.data?.metrics?.find((x) => x.label === label);
      const req = metric('Requests · 24h');
      return {
        status: site.status, updated: site.updated_at,
        requests: req?.value, visits: Number(/([\d.,]+)\s*visits/.exec(req?.note ?? '')?.[1]?.replace(/[.,]/g, '') ?? NaN),
        cached: /(\d+)% cached/.exec(req?.note ?? '')?.[1] ?? null, bytes: /([\d.,]+\s*[KMG]B)/.exec(req?.note ?? '')?.[1] ?? null,
        series: req?.series ?? [],
        uptime: metric('Uptime · 24h')?.value, response: metric('Response')?.value?.split(' / ')[0], errors: metric('Server errors · 24h')?.value, tls: metric('TLS certificate')?.value,
      };
    })(),
    activity: [...audit.map((a) => ({ day: String(a.created_at).slice(0, 10), who: a.member })), ...researchActivityAll.map((a) => ({ day: String(a.created_at).slice(0, 10), who: 'research' }))]
      .reduce((acc, { day }) => ({ ...acc, [day]: (acc[day] ?? 0) + 1 }), {}),
    attention: [
      ...(nah?.attention ?? []).map((item) => ({ app: 'NAH', title: item.title, detail: item.detail })),
      ...(academy?.tasks ?? []).filter((task) => task.due_on <= today).map((task) => ({ app: 'Academy', title: task.title, detail: `Due ${task.due_on}` })),
      ...(academy?.attention ?? []).map((item) => ({ app: 'Academy', title: item.title ?? String(item), detail: item.detail ?? '' })),
      ...(fund && fund.status !== 'ok' ? [{ app: 'Research', title: `Fund ${fund.status}`, detail: '' }] : []),
      ...(j?.summary.draftCount ? [{ app: 'Journal', title: `${j.summary.draftCount} draft transactions`, detail: '' }] : []),
      ...(bankLines.filter((l) => l.status === 'unmatched').length ? [{ app: 'Journal', title: `${bankLines.filter((l) => l.status === 'unmatched').length} unmatched bank lines`, detail: '' }] : []),
      ...(reimbursements.filter((r) => r.status === 'pending').length ? [{ app: 'StudioStaff', title: `${reimbursements.filter((r) => r.status === 'pending').length} pending reimbursements`, detail: '' }] : []),
      ...list('researchMonitor').filter((m) => m.status !== 'ok').map((m) => ({ app: 'Research', title: `${m.title}: ${m.headline}`, detail: '' })),
    ],
  };


  data.traffic = await trafficPromise;
  data.visitorSources = await sourcesPromise;
  return data;
}
