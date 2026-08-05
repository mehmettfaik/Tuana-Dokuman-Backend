const winston = require('winston');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'tuana-dokuman-backend' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          let logMsg = `[${timestamp}] ${level}: ${message}`;
          if (stack) logMsg += `\n${stack}`;
          
          // Print additional metadata if present (excluding service name for brevity on console)
          const metaStr = Object.keys(meta)
            .filter(key => key !== 'service')
            .map(key => `${key}=${typeof meta[key] === 'object' ? JSON.stringify(meta[key]) : meta[key]}`)
            .join(', ');
            
          if (metaStr) logMsg += ` { ${metaStr} }`;
          return logMsg;
        })
      )
    })
  ],
});

module.exports = logger;
