import app from './app';
import { initCronJobs } from './services/cronJobs';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Workforce Tracker API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Start scheduled jobs
  initCronJobs();
});

