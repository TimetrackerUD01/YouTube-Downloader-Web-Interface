const express = require('express');
const ytdl = require('@distube/ytdl-core');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Set environment variables for security
process.env.YTDL_NO_UPDATE = 'true';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// เสิร์ฟไฟล์ HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint สำหรับดึงข้อมูลวิดีโอ
app.post('/api/video-info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // ตรวจสอบ URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log(`🔍 Fetching info for: ${url}`);
    
    // ดึงข้อมูลวิดีโอ
    const info = await ytdl.getInfo(url);
    
    // เตรียมข้อมูลที่จะส่งกลับ
    const videoDetails = {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      lengthSeconds: info.videoDetails.lengthSeconds,
      viewCount: info.videoDetails.viewCount,
      description: info.videoDetails.description.substring(0, 200) + '...',
      thumbnail: info.videoDetails.thumbnails[0]?.url,
      videoId: info.videoDetails.videoId
    };

    // จัดกลุ่ม formats
    const audioVideoFormats = ytdl.filterFormats(info.formats, 'audioandvideo')
      .map(format => ({
        itag: format.itag,
        quality: format.qualityLabel || format.quality,
        container: format.container,
        size: format.contentLength ? `${Math.round(format.contentLength / 1024 / 1024)} MB` : 'Unknown',
        type: 'audio+video'
      }))
      .slice(0, 5); // แสดงแค่ 5 อันดับแรก

    const videoOnlyFormats = ytdl.filterFormats(info.formats, 'videoonly')
      .map(format => ({
        itag: format.itag,
        quality: format.qualityLabel || format.quality,
        container: format.container,
        size: format.contentLength ? `${Math.round(format.contentLength / 1024 / 1024)} MB` : 'Unknown',
        type: 'video-only'
      }))
      .slice(0, 5);

    const audioOnlyFormats = ytdl.filterFormats(info.formats, 'audioonly')
      .map(format => ({
        itag: format.itag,
        quality: format.audioBitrate ? `${format.audioBitrate}kbps` : 'Unknown',
        container: format.container,
        size: format.contentLength ? `${Math.round(format.contentLength / 1024 / 1024)} MB` : 'Unknown',
        type: 'audio-only'
      }))
      .slice(0, 5);

    res.json({
      success: true,
      videoDetails,
      formats: {
        audioVideo: audioVideoFormats,
        videoOnly: videoOnlyFormats,
        audioOnly: audioOnlyFormats
      }
    });
  } catch (error) {
    console.error('❌ Error fetching video info:', error.message);
    
    // ส่งข้อความ error ที่เข้าใจง่าย
    let errorMessage = 'Failed to get video information';
    let statusCode = 500;

    if (error.message.includes('Video unavailable')) {
      errorMessage = 'Video is unavailable, private, or deleted';
      statusCode = 404;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout - please try again';
      statusCode = 408;
    } else if (error.message.includes('Sign in')) {
      errorMessage = 'This video requires authentication';
      statusCode = 403;
    } else if (error.message.includes('age')) {
      errorMessage = 'Age-restricted content not supported';
      statusCode = 403;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// API endpoint สำหรับดาวน์โหลด
app.get('/api/download', async (req, res) => {
  try {
    const { url, itag, type } = req.query;

    if (!url || !itag) {
      return res.status(400).json({ error: 'URL and itag are required' });
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log(`⬇️  Starting download: ${url}, itag: ${itag}`);

    const info = await ytdl.getInfo(url);
    const format = info.formats.find(f => f.itag == itag);
    
    if (!format) {
      return res.status(404).json({ error: 'Format not found' });
    }

    // ตั้งชื่อไฟล์
    const title = info.videoDetails.title.replace(/[^\w\s-]/g, '').trim();
    const extension = format.container || 'mp4';
    const filename = `${title}.${extension}`;

    // ตั้งค่า headers สำหรับดาวน์โหลด
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', format.mimeType || 'video/mp4');

    // สร้าง download stream
    const stream = ytdl(url, { 
      format: format,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    });

    // ส่ง stream ไปยัง response
    stream.pipe(res);

    stream.on('error', (error) => {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed: ' + error.message });
      }
    });

    res.on('close', () => {
      console.log('Download connection closed');
      stream.destroy();
    });

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// สำหรับดาวน์โหลดแบบ streaming (แสดง progress)
app.get('/api/stream-download', async (req, res) => {
  try {
    const { url, quality } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🎵 Streaming download: ${url}, quality: ${quality}`);

    const stream = ytdl(url, { 
      quality: quality || 'lowest',
      filter: 'audioandvideo'
    });

    let downloaded = 0;
    
    stream.on('data', (chunk) => {
      downloaded += chunk.length;
      console.log(`Downloaded: ${(downloaded / 1024 / 1024).toFixed(2)} MB`);
    });

    stream.on('info', (videoInfo, format) => {
      const title = videoInfo.videoDetails.title.replace(/[^\w\s-]/g, '');
      const filename = `${title}.${format.container}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', format.mimeType);
    });

    stream.pipe(res);

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: error.message });
  }
});

// เริ่ม server
app.listen(PORT, () => {
  console.log(`🚀 YouTube Downloader Server running on http://localhost:${PORT}`);
  console.log(`📺 Open your browser to start downloading!`);
});
