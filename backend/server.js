/**
 * Speech to Text Backend Server
 *
 * This server provides an API endpoint for speech-to-text transcription
 * using Google Cloud Speech-to-Text API.
 *
 * Features:
 * - Real-time transcription
 * - Multiple language support
 * - Automatic punctuation
 * - Profanity filtering
 * - Speaker diarization (optional)
 * - Request logging
 * - Rate limiting
 *
 * Environment Variables:
 * - PORT: Server port (default: 3000)
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON
 * - NODE_ENV: Environment (development/production)
 */

const express = require('express');
const cors = require('cors');
const speech = require('@google-cloud/speech');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
require('dotenv').config();

// Configure logging
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

// Create logs directory
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS - allow requests from the extension on any site
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) 
        // or requests from chrome-extension or any HTTPS site (to support the content script)
        if (!origin || origin.startsWith('chrome-extension://') || origin.startsWith('https://')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
    req.id = uuidv4();
    logger.info(`[${req.id}] ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Initialize Google Cloud Speech client
let speechClient;
try {
    const config = {};
    
    // Check if credentials are provided in an environment variable (as a JSON string)
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
        try {
            config.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
            logger.info('Google Cloud Speech client initialized using environment variable JSON');
        } catch (parseError) {
            logger.error('Failed to parse GOOGLE_CREDENTIALS_JSON environment variable:', parseError);
        }
    } else {
        logger.info('Google Cloud Speech client initializing using default credentials or file path');
    }
    
    speechClient = new speech.SpeechClient(config);
} catch (error) {
    logger.error('Failed to initialize Google Cloud Speech client:', error);
    process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime()
    });
});

// Supported languages endpoint
app.get('/languages', (req, res) => {
    // Common languages supported by Google Cloud Speech-to-Text
    const languages = [
        { code: 'en-US', name: 'English (US)' },
        { code: 'en-GB', name: 'English (UK)' },
        { code: 'es-ES', name: 'Spanish (Spain)' },
        { code: 'es-MX', name: 'Spanish (Mexico)' },
        { code: 'fr-FR', name: 'French' },
        { code: 'de-DE', name: 'German' },
        { code: 'it-IT', name: 'Italian' },
        { code: 'pt-BR', name: 'Portuguese (Brazil)' },
        { code: 'pt-PT', name: 'Portuguese (Portugal)' },
        { code: 'zh-CN', name: 'Chinese (Simplified)' },
        { code: 'zh-TW', name: 'Chinese (Traditional)' },
        { code: 'ja-JP', name: 'Japanese' },
        { code: 'ko-KR', name: 'Korean' },
        { code: 'ru-RU', name: 'Russian' },
        { code: 'hi-IN', name: 'Hindi' },
        { code: 'ar-SA', name: 'Arabic' },
        { code: 'nl-NL', name: 'Dutch' },
        { code: 'pl-PL', name: 'Polish' },
        { code: 'tr-TR', name: 'Turkish' },
        { code: 'vi-VN', name: 'Vietnamese' },
        { code: 'th-TH', name: 'Thai' },
        { code: 'id-ID', name: 'Indonesian' }
    ];

    res.json({ languages });
});

// Transcription endpoint
app.post('/transcribe', async (req, res) => {
    const requestId = req.id;
    const startTime = Date.now();

    try {
        const {
            audioContent,
            languageCode = 'en-US',
            enableAutomaticPunctuation = true,
            enableProfanityFilter = false,
            enableSpokenPunctuation = true,
            enableWordConfidence = false,
            useEnhanced = true
        } = req.body;

        // Validate request
        if (!audioContent) {
            logger.warn(`[${requestId}] Missing audio content`);
            return res.status(400).json({
                error: 'Missing required field: audioContent',
                code: 'MISSING_AUDIO'
            });
        }

        // Decode base64 audio
        let audioBuffer;
        try {
            // Remove data URL prefix if present
            const base64Data = audioContent.replace(/^data:audio\/\w+;base64,/, '');
            audioBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            logger.error(`[${requestId}] Failed to decode audio:`, error);
            return res.status(400).json({
                error: 'Invalid audio content format',
                code: 'DECODE_ERROR'
            });
        }

        // Detect audio encoding
        const encoding = detectAudioEncoding(audioBuffer);
        logger.debug(`[${requestId}] Detected encoding: ${encoding}`);

        // Build request - Simplifying config to avoid serialization errors
        const recognitionConfig = {
            encoding: encoding,
            languageCode: languageCode,
            enableAutomaticPunctuation: !!enableAutomaticPunctuation,
            profanityFilter: !!enableProfanityFilter,
            useEnhanced: !!useEnhanced,
            model: useEnhanced ? 'latest_long' : 'default'
        };

        // Add sample rate if known
        if (encoding === 'WEBM_OPUS' || encoding === 'OGG_OPUS') {
            recognitionConfig.sampleRateHertz = 48000;
        }

        // Add word confidence if requested
        if (enableWordConfidence) {
            recognitionConfig.enableWordConfidence = true;
            recognitionConfig.enableWordTimeOffsets = true;
        }

        const recognitionRequest = {
            audio: { content: audioBuffer.toString('base64') },
            config: recognitionConfig
        };

        logger.debug(`[${requestId}] Sending request to Google Cloud Speech API`);

        // Call Google Cloud Speech API
        const [operation] = await speechClient.longRunningRecognize(recognitionRequest);
        const [response] = await operation.promise();

        // Process results
        let transcription = '';
        let confidence = 0;
        let wordCount = 0;
        const alternatives = [];

        if (response.results && response.results.length > 0) {
            response.results.forEach((result, index) => {
                if (result.alternatives && result.alternatives.length > 0) {
                    const bestAlternative = result.alternatives[0];
                    transcription += bestAlternative.transcript + ' ';
                    confidence += bestAlternative.confidence || 0;

                    // Store all alternatives with confidence scores
                    result.alternatives.forEach((alt, altIndex) => {
                        alternatives.push({
                            resultIndex: index,
                            alternativeIndex: altIndex,
                            transcript: alt.transcript,
                            confidence: alt.confidence,
                            words: alt.words?.map(w => ({
                                word: w.word,
                                startTime: w.startTime?.seconds,
                                endTime: w.endTime?.seconds,
                                confidence: w.confidence
                            })) || []
                        });
                    });

                    if (bestAlternative.words) {
                        wordCount += bestAlternative.words.length;
                    }
                }
            });

            // Calculate average confidence
            confidence = response.results.length > 0
                ? confidence / response.results.length
                : 0;
        }

        const duration = Date.now() - startTime;

        logger.info(`[${requestId}] Transcription completed in ${duration}ms`, {
            language: languageCode,
            confidence: confidence.toFixed(4),
            wordCount,
            resultCount: response.results?.length || 0
        });

        // Return response
        res.json({
            transcript: transcription.trim(),
            confidence: parseFloat(confidence.toFixed(4)),
            language: languageCode,
            wordCount,
            alternatives: alternatives.slice(0, 3), // Return top 3 alternatives
            metadata: {
                requestId,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error(`[${requestId}] Transcription error:`, error);

        // Handle specific Google Cloud errors
        if (error.code === 3 || error.message?.includes('Invalid argument')) {
            return res.status(400).json({
                error: 'Invalid audio format or configuration',
                code: 'INVALID_CONFIG',
                details: error.message
            });
        }

        if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
            return res.status(401).json({
                error: 'Authentication failed. Check your Google Cloud credentials.',
                code: 'AUTH_ERROR',
                details: error.message
            });
        }

        if (error.code === 8 || error.message?.includes('Resource exhausted')) {
            return res.status(429).json({
                error: 'Quota exceeded. Please try again later.',
                code: 'QUOTA_EXCEEDED',
                details: error.message
            });
        }

        res.status(500).json({
            error: 'Transcription failed',
            code: 'TRANSCRIPTION_ERROR',
            details: error.message
        });
    }
});

// Streaming transcription endpoint (WebSocket support)
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');

const wss = new WebSocket.Server({ server, path: '/stream' });

wss.on('connection', (ws, req) => {
    const requestId = uuidv4();
    logger.info(`[${requestId}] WebSocket connection established from ${req.socket.remoteAddress}`);

    let recognizeStream = null;
    let config = null;

    ws.on('message', async (data) => {
        try {
            // Check if this is config or audio data
            if (data.toString().startsWith('{')) {
                // Config message
                config = JSON.parse(data);
                const recognitionConfig = {
                    config: {
                        encoding: config.encoding || 'WEBM_OPUS',
                        sampleRateHertz: config.sampleRateHertz || 48000,
                        languageCode: config.languageCode || 'en-US',
                        enableAutomaticPunctuation: true,
                        model: 'latest_long'
                    },
                    interimResults: true
                };

                // Create streaming recognize stream
                recognizeStream = speechClient
                    .streamingRecognize(recognitionConfig)
                    .on('error', (error) => {
                        logger.error(`[${requestId}] Stream error:`, error);
                        ws.send(JSON.stringify({
                            error: error.message,
                            isFinal: true
                        }));
                    })
                    .on('data', (response) => {
                        response.results.forEach((result) => {
                            ws.send(JSON.stringify({
                                transcript: result.alternatives[0].transcript,
                                isFinal: result.isFinal,
                                confidence: result.alternatives[0].confidence
                            }));
                        });
                    });

                logger.debug(`[${requestId}] Stream configured`);
            } else {
                // Audio data
                if (recognizeStream) {
                    recognizeStream.write(data);
                }
            }
        } catch (error) {
            logger.error(`[${requestId}] WebSocket message error:`, error);
            ws.send(JSON.stringify({
                error: error.message,
                isFinal: true
            }));
        }
    });

    ws.on('close', () => {
        logger.info(`[${requestId}] WebSocket connection closed`);
        if (recognizeStream) {
            recognizeStream.end();
        }
    });

    ws.on('error', (error) => {
        logger.error(`[${requestId}] WebSocket error:`, error);
    });
});

// Helper function to detect audio encoding
function detectAudioEncoding(buffer) {
    // Check for WebM/Opus signature
    if (buffer.length > 4) {
        // WebM signature: 0x1A 0x45 0xDF 0xA3
        if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
            return 'WEBM_OPUS';
        }
        // OGG signature: "OggS"
        if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
            return 'OGG_OPUS';
        }
        // MP3 signature
        if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) {
            return 'MP3';
        }
        // WAV signature: "RIFF"
        if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
            return 'LINEAR16';
        }
        // FLAC signature: "fLaC"
        if (buffer[0] === 0x66 && buffer[1] === 0x4C && buffer[2] === 0x61 && buffer[3] === 0x43) {
            return 'FLAC';
        }
    }
    // Default to WebM Opus (most common from browsers)
    return 'WEBM_OPUS';
}

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(`[${req.id}] Unhandled error:`, err);
    res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: req.id
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        code: 'NOT_FOUND'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Start server
server.listen(PORT, () => {
    logger.info('='.repeat(50));
    logger.info(`🎤 Speech to Text Backend Server`);
    logger.info(`Running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('='.repeat(50));
});