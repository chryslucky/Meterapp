import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { consumption, estimateBill } from './billing.js';

export const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'metermind-api' }));

router.post('/auth/register', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10) {
      return res.status(400).json({ error: 'Use a valid email and a password of at least 10 characters.' });
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query('INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email', [email, hash]);
    const user = rows[0];
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(user.id), expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' });
    next(error);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const { rows } = await pool.query('SELECT id,email,password_hash FROM users WHERE email=$1', [email]);
    if (!rows[0] || !(await bcrypt.compare(String(req.body.password || ''), rows[0].password_hash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    const user = { id: rows[0].id, email: rows[0].email };
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(user.id), expiresIn: '7d' });
    res.json({ user, token });
  } catch (error) { next(error); }
});

router.get('/meters', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id,name,utility,unit,created_at FROM meters WHERE user_id=$1 ORDER BY created_at DESC', [req.userId]);
    res.json({ meters: rows });
  } catch (error) { next(error); }
});

router.post('/meters', requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const utility = String(req.body.utility || '').toLowerCase();
    const unit = utility === 'electricity' ? 'kWh' : utility === 'water' ? 'm3' : '';
    if (!name || !unit) return res.status(400).json({ error: 'Provide a name and utility of electricity or water.' });
    const { rows } = await pool.query('INSERT INTO meters(user_id,name,utility,unit) VALUES($1,$2,$3,$4) RETURNING *', [req.userId,name,utility,unit]);
    res.status(201).json({ meter: rows[0] });
  } catch (error) { next(error); }
});

router.get('/readings', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT r.id,r.reading_value,r.reading_date,m.id AS meter_id,m.name,m.utility,m.unit
      FROM readings r JOIN meters m ON m.id=r.meter_id
      WHERE m.user_id=$1 ORDER BY r.reading_date DESC,r.id DESC LIMIT 500`, [req.userId]);
    res.json({ readings: rows });
  } catch (error) { next(error); }
});

router.post('/readings', requireAuth, async (req, res, next) => {
  try {
    const meterId = Number(req.body.meterId);
    const value = Number(req.body.value);
    const date = String(req.body.date || '');
    if (!Number.isSafeInteger(meterId) || meterId < 1 || !Number.isFinite(value) || value < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Provide a valid meter, non-negative reading and YYYY-MM-DD date.' });
    }
    const owned = await pool.query('SELECT id FROM meters WHERE id=$1 AND user_id=$2', [meterId, req.userId]);
    if (!owned.rowCount) return res.status(404).json({ error: 'Meter not found.' });
    const prior = await pool.query('SELECT reading_value,reading_date FROM readings WHERE meter_id=$1 AND reading_date < $2 ORDER BY reading_date DESC LIMIT 1', [meterId, date]);
    const next = await pool.query('SELECT reading_value,reading_date FROM readings WHERE meter_id=$1 AND reading_date > $2 ORDER BY reading_date ASC LIMIT 1', [meterId, date]);
    if (prior.rows[0] && value < Number(prior.rows[0].reading_value)) return res.status(400).json({ error: 'Reading cannot be lower than the previous recorded value.' });
    if (next.rows[0] && value > Number(next.rows[0].reading_value)) return res.status(400).json({ error: 'Reading cannot exceed a later recorded value.' });
    const { rows } = await pool.query('INSERT INTO readings(meter_id,reading_value,reading_date) VALUES($1,$2,$3) RETURNING *', [meterId,value,date]);
    res.status(201).json({ reading: rows[0], consumptionSincePrevious: prior.rows[0] ? consumption(prior.rows[0].reading_value, value) : null });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'A reading already exists for that meter and date.' });
    next(error);
  }
});

router.get('/tariffs', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id,utility,rate_per_unit,fixed_charge,currency,effective_from FROM tariffs WHERE user_id=$1 ORDER BY utility,effective_from DESC', [req.userId]);
    res.json({ tariffs: rows });
  } catch (error) { next(error); }
});

router.put('/tariffs/:utility', requireAuth, async (req, res, next) => {
  try {
    const utility = String(req.params.utility).toLowerCase();
    const rate = Number(req.body.ratePerUnit);
    const fixed = Number(req.body.fixedCharge || 0);
    const date = String(req.body.effectiveFrom || new Date().toISOString().slice(0,10));
    if (!['electricity','water'].includes(utility) || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(fixed) || fixed < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid utility tariff settings.' });
    }
    const { rows } = await pool.query(`INSERT INTO tariffs(user_id,utility,rate_per_unit,fixed_charge,effective_from)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,utility,effective_from)
      DO UPDATE SET rate_per_unit=EXCLUDED.rate_per_unit,fixed_charge=EXCLUDED.fixed_charge
      RETURNING id,utility,rate_per_unit,fixed_charge,currency,effective_from`, [req.userId,utility,rate,fixed,date]);
    res.json({ tariff: rows[0] });
  } catch (error) { next(error); }
});

router.get('/estimates/:utility', requireAuth, async (req, res, next) => {
  try {
    const utility = String(req.params.utility).toLowerCase();
    if (!['electricity','water'].includes(utility)) return res.status(400).json({ error: 'Unsupported utility.' });
    const { rows } = await pool.query(`SELECT m.id AS meter_id,r.reading_value,r.reading_date
      FROM meters m JOIN LATERAL (
        SELECT reading_value,reading_date FROM readings WHERE meter_id=m.id ORDER BY reading_date DESC LIMIT 1
      ) r ON TRUE WHERE m.user_id=$1 AND m.utility=$2`, [req.userId,utility]);
    const { rows: tariffRows } = await pool.query('SELECT rate_per_unit,fixed_charge,currency,effective_from FROM tariffs WHERE user_id=$1 AND utility=$2 AND effective_from <= CURRENT_DATE ORDER BY effective_from DESC LIMIT 1', [req.userId,utility]);
    if (!tariffRows[0]) return res.status(404).json({ error: 'Configure a tariff before estimating a bill.' });
    const meters = [];
    for (const latest of rows) {
      const previous = await pool.query('SELECT reading_value,reading_date FROM readings WHERE meter_id=$1 AND reading_date < $2 ORDER BY reading_date DESC LIMIT 1', [latest.meter_id,latest.reading_date]);
      if (previous.rows[0]) {
        const units = consumption(previous.rows[0].reading_value, latest.reading_value);
        const tariff = tariffRows[0];
        meters.push({ meterId: latest.meter_id, units, currency: tariff.currency, estimate: estimateBill({ units, ratePerUnit: tariff.rate_per_unit, fixedCharge: tariff.fixed_charge }) });
      }
    }
    res.json({ utility, meters, totalEstimate: Number(meters.reduce((sum,m) => sum + m.estimate, 0).toFixed(2)), currency: tariffRows[0].currency, note: 'Flat-rate estimate only; taxes, levies and tiered tariffs may not be included.' });
  } catch (error) { next(error); }
});
