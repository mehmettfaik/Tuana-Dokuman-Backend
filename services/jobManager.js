const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class JobManager {
  constructor() {
    this.jobs = new Map();
    // Production ortamında yazma izni olan klasör kullan
    this.outputDir = process.env.NODE_ENV === 'production' 
      ? path.join(os.tmpdir(), 'pdfs')
      : path.join(__dirname, '../temp/pdfs');
    this.ensureOutputDirectory();
  }

  async ensureOutputDirectory() {
    try {
      await fs.ensureDir(this.outputDir);
      console.log(`Output directory created/verified: ${this.outputDir}`);
    } catch (error) {
      console.error('Error creating output directory:', error);
      // Fallback to system temp directory
      this.outputDir = path.join(os.tmpdir(), 'pdfs');
      try {
        await fs.ensureDir(this.outputDir);
        console.log(`Fallback output directory created: ${this.outputDir}`);
      } catch (fallbackError) {
        console.error('Error creating fallback output directory:', fallbackError);
        throw fallbackError;
      }
    }
  }

  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createJob(docType, formData, language = 'en') {
    const jobId = this.generateJobId();
    const job = {
      id: jobId,
      status: 'pending', // pending, processing, completed, failed
      docType,
      formData,
      language,
      createdAt: new Date(),
      updatedAt: new Date(),
      filePath: null,
      error: null,
      downloadUrl: null
    };

    this.jobs.set(jobId, job);
    return jobId;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  updateJobStatus(jobId, status, filePath = null, error = null) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job with id ${jobId} not found`);
    }

    job.status = status;
    job.updatedAt = new Date();
    
    if (filePath) {
      job.filePath = filePath;
      job.downloadUrl = `/api/pdf/download/${jobId}`;
    }
    
    if (error) {
      job.error = error;
    }

    this.jobs.set(jobId, job);
    return job;
  }

  getJobFilePath(jobId) {
    const job = this.jobs.get(jobId);
    return job ? job.filePath : null;
  }

  deleteJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job && job.filePath) {
      // Dosyayı sil
      fs.unlink(job.filePath).catch(err => {
        console.error('Error deleting file:', err);
      });
    }
    return this.jobs.delete(jobId);
  }

  // Belirli bir süre sonra eski job'ları temizle
  cleanupOldJobs(maxAge = 24 * 60 * 60 * 1000) { // 24 saat
    const now = new Date();
    for (const [jobId, job] of this.jobs.entries()) {
      if (now - job.createdAt > maxAge) {
        this.deleteJob(jobId);
      }
    }
  }

  // Tüm job'ları listele (debug için)
  getAllJobs() {
    return Array.from(this.jobs.values());
  }
}

// Singleton instance
const jobManager = new JobManager();

// Her saat eski job'ları temizle
setInterval(() => {
  jobManager.cleanupOldJobs();
}, 60 * 60 * 1000); // 1 saat

module.exports = jobManager;
