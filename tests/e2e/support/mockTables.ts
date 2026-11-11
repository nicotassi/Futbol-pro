/**
 * Mini "PostgREST" en memoria para los tests de interfaz: filtros eq/is/gte/lte,
 * orden, límite, inserción, actualización y borrado, más las funciones
 * save_workout y finish_session. Replica los permisos de la base (RLS).
 */
type Row = Record<string, unknown>;

export interface TableStore {
  [table: string]: Row[];
}

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

export function seedTables(playerId: string): TableStore {
  const ex = (name: string, category: string, extra: Row = {}): Row => ({
    id: uuid(),
    player_id: playerId,
    name,
    category,
    objective: `Objetivo de ${name}`,
    description: null,
    difficulty: 1,
    est_minutes: 5,
    materials: ['Pelota'],
    steps: ['Paso uno', 'Paso dos'],
    common_mistakes: ['Error común'],
    precautions: null,
    result_indicator: 'Repeticiones',
    media_path: null,
    media_url: null,
    is_custom: false,
    created_by: null,
    created_at: now(),
    updated_at: now(),
    ...extra,
  });
  return {
    exercises: [
      ex('Dominio de pelota', 'technique'),
      ex('Plancha', 'strength', { est_minutes: 4 }),
      ex('Escalera de coordinación', 'coordination'),
    ],
    exercise_favorites: [],
    workout_templates: [],
    workout_items: [],
    workout_sessions: [],
    session_results: [],
    matches: [],
    match_statistics: [],
    match_reflections: [],
    wellness_logs: [],
    goals: [],
    assessments: [],
    calendar_events: [],
  };
}

function matches(row: Row, params: URLSearchParams): boolean {
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    const cell = row[key];
    const asString = cell === null || cell === undefined ? null : String(cell);
    switch (op) {
      case 'eq':
        if (asString !== value) return false;
        break;
      case 'neq':
        if (asString === value) return false;
        break;
      case 'is':
        if (value === 'null' ? cell !== null && cell !== undefined : String(cell) !== value)
          return false;
        break;
      case 'in':
        if (
          !value
            .replace(/^\(|\)$/g, '')
            .split(',')
            .includes(asString ?? '')
        )
          return false;
        break;
      case 'gte':
        if (asString === null || asString < value) return false;
        break;
      case 'lte':
        if (asString === null || asString > value) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

function sortRows(rows: Row[], order: string | null): Row[] {
  if (!order) return rows;
  const specs = order.split(',').map((spec) => {
    const [col, dir, nulls] = spec.split('.');
    return { col: col!, desc: dir === 'desc', nullsFirst: nulls === 'nullsfirst' };
  });
  return [...rows].sort((a, b) => {
    for (const { col, desc, nullsFirst } of specs) {
      const x = a[col];
      const y = b[col];
      if (x === y) continue;
      if (x === null || x === undefined) return nullsFirst ? -1 : 1;
      if (y === null || y === undefined) return nullsFirst ? 1 : -1;
      const cmp = String(x) < String(y) ? -1 : 1;
      return desc ? -cmp : cmp;
    }
    return 0;
  });
}

export interface Caller {
  id: string;
  role: 'admin' | 'player';
}

export type RestResult = { status: number; body: unknown };

const forbidden: RestResult = {
  status: 403,
  body: { code: '42501', message: 'permission denied' },
};

/** Tablas que solo papá puede modificar. */
const ADMIN_WRITE = new Set(['exercises', 'workout_templates', 'workout_items', 'assessments']);

export function handleTable(
  tables: TableStore,
  table: string,
  method: string,
  params: URLSearchParams,
  body: unknown,
  caller: Caller,
): RestResult | null {
  const rows = tables[table];
  if (!rows) return null;
  const visible =
    table === 'exercise_favorites' ? rows.filter((r) => r.user_id === caller.id) : rows;

  if (method === 'GET') {
    let result = sortRows(
      visible.filter((r) => matches(r, params)),
      params.get('order'),
    );
    const limit = params.get('limit');
    if (limit) result = result.slice(0, Number(limit));
    return { status: 200, body: result };
  }

  if (ADMIN_WRITE.has(table) && caller.role !== 'admin') {
    // RLS: el jugador no puede escribir. Inserción → error; update/delete → 0 filas.
    return method === 'POST' ? forbidden : { status: 200, body: [] };
  }

  // RLS de objetivos: el jugador solo propone (sin aprobar) y solo toca lo suyo sin aprobar.
  if (table === 'goals' && caller.role !== 'admin') {
    if (method === 'POST') {
      const list = (Array.isArray(body) ? body : [body]) as Row[];
      if (list.some((r) => r.approved === true)) return forbidden;
    } else if (method === 'PATCH') {
      const target = visible.filter((r) => matches(r, params));
      if ((body as Row).approved === true) return { status: 200, body: [] };
      target.filter((r) => r.approved === true).forEach((r) => target.splice(target.indexOf(r), 1));
      target.forEach((r) => Object.assign(r, body as Row, { updated_at: now() }));
      return { status: 200, body: target };
    }
  }

  if (method === 'POST') {
    const list = (Array.isArray(body) ? body : [body]) as Row[];
    if (table === 'exercise_favorites' && list.some((r) => r.user_id !== caller.id))
      return forbidden;
    const inserted = list.map((r) => ({
      id: uuid(),
      created_at: now(),
      updated_at: now(),
      created_by: caller.id,
      ...(table === 'goals'
        ? { progress: 0, status: 'pending', removed: false, approved: false }
        : {}),
      ...(table === 'assessments' ? { removed: false } : {}),
      ...(table === 'calendar_events' ? { status: 'planned' } : {}),
      ...r,
    }));
    rows.push(...inserted);
    return { status: 201, body: inserted };
  }

  if (method === 'PATCH') {
    const target = visible.filter((r) => matches(r, params));
    target.forEach((r) => Object.assign(r, body as Row, { updated_at: now() }));
    return { status: 200, body: target };
  }

  if (method === 'DELETE') {
    const target = visible.filter((r) => matches(r, params));
    if (
      table === 'exercises' &&
      target.some((r) => tables.workout_items!.some((i) => i.exercise_id === r.id))
    ) {
      return { status: 409, body: { code: '23503', message: 'violates foreign key constraint' } };
    }
    tables[table] = rows.filter((r) => !target.includes(r));
    if (table === 'workout_templates') {
      const ids = new Set(target.map((t) => t.id));
      tables.workout_items = tables.workout_items!.filter((i) => !ids.has(i.template_id));
    }
    return { status: 200, body: target };
  }

  return null;
}

const blank = (v: unknown) => (v === '' || v === undefined ? null : v);
const num = (v: unknown) => (blank(v) === null ? null : Number(v));

export function handleRpc(
  tables: TableStore,
  fn: string,
  body: Row,
  caller: Caller,
): RestResult | null {
  if (fn === 'save_workout') {
    if (caller.role !== 'admin') return forbidden;
    const w = body.p_workout as Row;
    const items = body.p_items as Row[];
    if (!items.length) return { status: 400, body: { code: '23514', message: 'sin ejercicios' } };
    let id = blank(w.id) as string | null;
    const data = {
      player_id: w.player_id,
      name: w.name,
      objective: blank(w.objective),
      notes: blank(w.notes),
      est_minutes: num(w.est_minutes),
      is_template: w.is_template,
      scheduled_for: blank(w.scheduled_for),
      updated_at: now(),
    };
    if (id) {
      const existing = tables.workout_templates!.find((t) => t.id === id);
      if (!existing) return forbidden;
      Object.assign(existing, data);
      tables.workout_items!.forEach((i) => {
        if (i.template_id === id) i.removed = true;
      });
    } else {
      id = uuid();
      tables.workout_templates!.push({ id, created_at: now(), created_by: caller.id, ...data });
    }
    items.forEach((it, position) =>
      tables.workout_items!.push({
        id: uuid(),
        template_id: id,
        player_id: w.player_id,
        exercise_id: it.exercise_id,
        position,
        sets: num(it.sets),
        reps: num(it.reps),
        duration_sec: num(it.duration_sec),
        rest_sec: num(it.rest_sec),
        instructions: blank(it.instructions),
        removed: false,
      }),
    );
    return { status: 200, body: id };
  }

  if (fn === 'finish_session') {
    const s = body.p_session as Row;
    const results = (body.p_results as Row[]) ?? [];
    const data = {
      player_id: s.player_id,
      template_id: blank(s.template_id),
      title: s.title,
      started_at: s.started_at,
      ended_at: blank(s.ended_at),
      status: s.status ?? 'completed',
      actual_minutes: num(s.actual_minutes),
      rpe: num(s.rpe),
      notes: blank(s.notes),
      post_state: num(s.post_state),
      client_id: s.client_id,
      hr_avg: num(s.hr_avg),
      hr_max: num(s.hr_max),
      calories: num(s.calories),
      training_load: num(s.training_load),
      aerobic_effect: num(s.aerobic_effect),
      anaerobic_effect: num(s.anaerobic_effect),
      zone_vo2max_pct: num(s.zone_vo2max_pct),
      zone_intensive_pct: num(s.zone_intensive_pct),
      updated_at: now(),
    };
    let session = tables.workout_sessions!.find((x) => x.client_id === s.client_id);
    if (session) Object.assign(session, data);
    else {
      session = { id: uuid(), created_at: now(), created_by: caller.id, ...data };
      tables.workout_sessions!.push(session);
    }
    tables.session_results!.forEach((r) => {
      if (r.session_id === session!.id) r.removed = true;
    });
    results.forEach((r) =>
      tables.session_results!.push({
        id: uuid(),
        session_id: session!.id,
        player_id: s.player_id,
        workout_item_id: blank(r.workout_item_id),
        exercise_id: blank(r.exercise_id),
        completed: Boolean(r.completed),
        sets_done: num(r.sets_done),
        reps_done: num(r.reps_done),
        value: null,
        unit: null,
        notes: null,
        removed: false,
      }),
    );
    return { status: 200, body: session.id };
  }
  if (fn === 'save_match') {
    const m = body.p_match as Row;
    const stats = body.p_stats as Row | null;
    const refl = body.p_reflection as Row | null;
    const data = {
      player_id: m.player_id,
      played_on: m.played_on,
      opponent: m.opponent,
      competition: blank(m.competition),
      goals_for: num(m.goals_for),
      goals_against: num(m.goals_against),
      position: blank(m.position),
      minutes: num(m.minutes),
      starter: blank(m.starter) === null ? null : m.starter === true || m.starter === 'true',
      notes: blank(m.notes),
      client_id: m.client_id,
      updated_at: now(),
    };
    let match = tables.matches!.find((x) => x.client_id === m.client_id);
    if (match) Object.assign(match, data);
    else {
      match = { id: uuid(), removed: false, created_at: now(), created_by: caller.id, ...data };
      tables.matches!.push(match);
    }
    const upsert = (table: string, values: Row | null) => {
      if (!values) return;
      const cleaned = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [
          k,
          typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : blank(v),
        ]),
      );
      const rows = tables[table]!;
      const existing = rows.find((r) => r.match_id === match!.id);
      if (existing) Object.assign(existing, cleaned);
      else rows.push({ match_id: match!.id, player_id: m.player_id, ...cleaned });
    };
    upsert('match_statistics', stats);
    upsert('match_reflections', refl);
    return { status: 200, body: match.id };
  }

  if (fn === 'save_wellness') {
    const w = body.p_log as Row;
    const data: Row = { player_id: w.player_id, log_date: w.log_date, updated_at: now() };
    for (const k of ['sleep_quality', 'energy', 'soreness', 'motivation', 'overall', 'hydration'])
      data[k] = num(w[k]);
    data.sleep_hours = num(w.sleep_hours);
    data.pain_level = num(w.pain_level) ?? 0;
    data.sick = w.sick === true || w.sick === 'true';
    data.discomfort = blank(w.discomfort);
    data.notes = blank(w.notes);
    const nums = ['sleep_quality', 'energy', 'soreness', 'motivation', 'overall', 'hydration'].map(
      (k) => data[k] as number | null,
    );
    const hours = data.sleep_hours as number | null;
    const any = hours !== null || nums.some((v) => v !== null);
    const [sq, en, so, mo, ov, hy] = nums;
    const low = (v: number | null, n: number) => v !== null && v <= n;
    data.traffic_light =
      data.sick || (data.pain_level as number) >= 2 || ov === 1
        ? 'red'
        : (data.pain_level as number) === 1 ||
            data.discomfort ||
            (hours !== null && hours < 8) ||
            low(sq, 2) ||
            low(en, 2) ||
            (so !== null && so >= 4) ||
            low(mo, 2) ||
            low(ov, 2) ||
            low(hy, 2)
          ? 'yellow'
          : any
            ? 'green'
            : null;
    let log = tables.wellness_logs!.find(
      (x) => x.player_id === w.player_id && x.log_date === w.log_date,
    );
    if (log) Object.assign(log, data);
    else {
      log = {
        id: uuid(),
        client_id: w.client_id,
        created_at: now(),
        created_by: caller.id,
        ...data,
      };
      tables.wellness_logs!.push(log);
    }
    return { status: 200, body: log.id };
  }
  return null;
}
