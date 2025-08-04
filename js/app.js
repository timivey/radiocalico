const audioPlayer = document.getElementById('audioPlayer');
const status = document.getElementById('status');
const streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';

let hls;

function initializePlayer() {
    if (Hls.isSupported()) {
        hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });
        
        hls.loadSource(streamUrl);
        hls.attachMedia(audioPlayer);
        
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            status.textContent = 'Stream loaded successfully';
            updateStreamQuality();
        });
        
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS Error:', data);
            status.textContent = 'Error loading stream: ' + data.details;
        });
        
        hls.on(Hls.Events.LEVEL_SWITCHED, function(event, data) {
            updateStreamQuality();
        });
        
    } else if (audioPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        audioPlayer.src = streamUrl;
        status.textContent = 'Using native HLS support';
        // Update quality info for native HLS
        updateStreamQuality();
    } else {
        status.textContent = 'HLS not supported in this browser';
        // Show fallback quality info
        document.getElementById('sourceQuality').textContent = 'Source quality: Unknown';
        document.getElementById('streamQuality').textContent = 'Stream quality: Not supported';
    }
}

audioPlayer.volume = 0.5;

audioPlayer.addEventListener('loadstart', function() {
    status.textContent = 'Loading stream...';
});

audioPlayer.addEventListener('canplay', function() {
    status.textContent = 'Ready to play';
});

audioPlayer.addEventListener('playing', function() {
    status.textContent = 'Playing - Lossless HLS Stream';
});

audioPlayer.addEventListener('pause', function() {
    status.textContent = 'Paused';
});

audioPlayer.addEventListener('ended', function() {
    status.textContent = 'Ended';
});

audioPlayer.addEventListener('error', function(e) {
    console.error('Audio error:', e);
    status.textContent = 'Playback error occurred';
});

const metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
const apiUrl = 'http://localhost:5001/api';
let currentTrack = null;

function updateStreamQuality() {
    const sourceQualityEl = document.getElementById('sourceQuality');
    const streamQualityEl = document.getElementById('streamQuality');
    
    if (hls && hls.levels && hls.levels.length > 0) {
        // Handle case where currentLevel is -1 (auto-selection)
        const levelIndex = hls.currentLevel >= 0 ? hls.currentLevel : 0;
        const currentLevel = hls.levels[levelIndex];
        
        if (currentLevel) {
            // Extract stream quality information
            const bitrate = currentLevel.bitrate ? Math.round(currentLevel.bitrate / 1000) : 'Unknown';
            const codec = currentLevel.audioCodec || 'Unknown';
            
            // Format codec information
            let codecDisplay = codec;
            if (codec.includes('mp4a.40.2')) {
                codecDisplay = 'AAC-LC';
            } else if (codec.includes('mp4a.40.5')) {
                codecDisplay = 'AAC-HE';
            } else if (codec.includes('flac')) {
                codecDisplay = 'FLAC';
            } else if (codec.includes('opus')) {
                codecDisplay = 'Opus';
            } else if (codec.includes('mp3')) {
                codecDisplay = 'MP3';
            }
            
            // Update stream quality display
            streamQualityEl.textContent = `Stream quality: ${bitrate}kbps ${codecDisplay} / HLS`;
            
            // Show clearer source quality messaging
            sourceQualityEl.textContent = `Source quality: Live Stream (${codecDisplay})`;
        } else {
            streamQualityEl.textContent = 'Stream quality: HLS Lossless';
            sourceQualityEl.textContent = 'Source quality: Unknown';
        }
    } else if (audioPlayer.src) {
        // Fallback for non-HLS browsers
        streamQualityEl.textContent = 'Stream quality: HLS Lossless (Native)';
        sourceQualityEl.textContent = 'Source quality: Unknown';
    } else {
        streamQualityEl.textContent = 'Stream quality: Loading...';
        sourceQualityEl.textContent = 'Source quality: Loading...';
    }
}

async function fetchMetadata() {
    try {
        const response = await fetch(metadataUrl);
        const data = await response.json();
        updateNowPlaying(data);
        updateRecentlyPlayed(data);
    } catch (error) {
        console.error('Error fetching metadata:', error);
        document.getElementById('currentTitle').textContent = 'Unable to load track info';
    }
}

function updateNowPlaying(data) {
    const titleEl = document.getElementById('currentTitle');
    const artistEl = document.getElementById('currentArtist');
    const albumEl = document.getElementById('currentAlbum');
    const albumArtEl = document.getElementById('albumArt');
    const placeholderEl = document.getElementById('albumArtPlaceholder');
    const ratingSectionEl = document.getElementById('ratingSection');
    
    if (data.title && data.artist) {
        titleEl.textContent = data.title;
        artistEl.textContent = data.artist;
        albumEl.textContent = data.album ? `${data.album} (Original Motion Picture Soundtrack)` : '';
        
        // Store current track info
        currentTrack = {
            title: data.title,
            artist: data.artist,
            album: data.album || ''
        };
        
        // Show rating section
        ratingSectionEl.style.display = 'block';
        
        // Load ratings for this track
        loadRatings(data.title, data.artist);
        
        // Load album art
        const coverUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg';
        const newImage = new Image();
        
        newImage.onload = function() {
            albumArtEl.src = coverUrl;
            albumArtEl.style.display = 'block';
            placeholderEl.style.display = 'none';
        };
        
        newImage.onerror = function() {
            albumArtEl.style.display = 'none';
            placeholderEl.style.display = 'block';
        };
        
        // Add cache-busting parameter to ensure fresh image
        newImage.src = coverUrl + '?t=' + Date.now();
        
    } else {
        titleEl.textContent = 'Loading track info...';
        artistEl.textContent = 'Loading...';
        albumEl.textContent = '';
        albumArtEl.style.display = 'none';
        placeholderEl.style.display = 'block';
        ratingSectionEl.style.display = 'none';
        currentTrack = null;
    }
}

function updateRecentlyPlayed(data) {
    const recentTracksEl = document.getElementById('recentTracks');
    const recentTracks = [];
    
    for (let i = 1; i <= 5; i++) {
        const artist = data[`prev_artist_${i}`];
        const title = data[`prev_title_${i}`];
        if (artist && title) {
            recentTracks.push({ artist, title });
        }
    }
    
    if (recentTracks.length > 0) {
        recentTracksEl.innerHTML = '';
        recentTracks.forEach(track => {
            const trackEl = document.createElement('div');
            trackEl.className = 'previous-track';
            trackEl.innerHTML = `
                <span class="previous-track-artist">${track.artist}:</span> 
                <span class="previous-track-title">${track.title}</span>
            `;
            recentTracksEl.appendChild(trackEl);
        });
    } else {
        recentTracksEl.innerHTML = '<div class="loading">No recent tracks available</div>';
    }
}

async function loadRatings(title, artist) {
    try {
        const response = await fetch(`${apiUrl}/ratings/${encodeURIComponent(title)}/${encodeURIComponent(artist)}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        document.getElementById('thumbsUpCount').textContent = data.thumbs_up;
        document.getElementById('thumbsDownCount').textContent = data.thumbs_down;
        
        // Update button states based on user's previous rating
        const thumbsUpBtn = document.getElementById('thumbsUpBtn');
        const thumbsDownBtn = document.getElementById('thumbsDownBtn');
        
        thumbsUpBtn.classList.remove('active');
        thumbsDownBtn.classList.remove('active');
        
        if (data.user_rating === 1) {
            thumbsUpBtn.classList.add('active');
        } else if (data.user_rating === -1) {
            thumbsDownBtn.classList.add('active');
        }
        
    } catch (error) {
        console.error('Error loading ratings:', error);
        document.getElementById('ratingMessage').textContent = 'Unable to load ratings';
    }
}

async function rateSong(rating) {
    if (!currentTrack) return;
    
    const messageEl = document.getElementById('ratingMessage');
    const thumbsUpBtn = document.getElementById('thumbsUpBtn');
    const thumbsDownBtn = document.getElementById('thumbsDownBtn');
    
    // Disable buttons during request
    thumbsUpBtn.disabled = true;
    thumbsDownBtn.disabled = true;
    
    try {
        const response = await fetch(`${apiUrl}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                title: currentTrack.title,
                artist: currentTrack.artist,
                album: currentTrack.album,
                rating: rating
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            messageEl.textContent = 'Thanks for rating!';
            // Reload ratings to get updated counts
            loadRatings(currentTrack.title, currentTrack.artist);
        } else {
            messageEl.textContent = data.error || 'Failed to submit rating';
        }
        
    } catch (error) {
        console.error('Error rating song:', error);
        messageEl.textContent = 'Unable to submit rating';
    } finally {
        // Re-enable buttons
        thumbsUpBtn.disabled = false;
        thumbsDownBtn.disabled = false;
        
        // Clear message after 3 seconds
        setTimeout(() => {
            messageEl.textContent = '';
        }, 3000);
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for rating buttons
    document.getElementById('thumbsUpBtn').addEventListener('click', () => rateSong(1));
    document.getElementById('thumbsDownBtn').addEventListener('click', () => rateSong(-1));
    
    fetchMetadata();
    setInterval(fetchMetadata, 30000);
    
    initializePlayer();
});