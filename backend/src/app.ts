import express from 'express';
import cors from 'cors';
import entriesRouter from './routes/entries.js';
import calendarRouter from './routes/calendar.js';
import songsRouter from './routes/songs.js';
import settingsRouter from './routes/settings.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/entries', entriesRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/songs', songsRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
