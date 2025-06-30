// เก็บค่าคงที่และค่าเริ่มต้นของแอปพลิเคชัน
// APP_VERSION is now fetched dynamically from changelog.json in app.js
export const CHART_COLORS = ['#facc15', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];

// Default configuration object to prevent errors if config from server is incomplete
export const DEFAULTS = {
    "interval": 30,
    "retentionHours": 48,
    "apiUrl": "https://ars.coilinter.com/mqtt/Advantech..74FE4895EFE7..data.txt",
    "pinHash": "",
    "params": [
        { "displayName": "Suspended Solids", "jsonKey": "ai1", "unit": "mg/L", "type": "value", "mode": "real", "formula": "x", "min": 0, "max": 50, "displayMax": 50, "sim_initial": 8.9, "sim_range": 1, "sim_min": 5, "sim_max": 45 },
        { "displayName": "Turbidity", "jsonKey": "ai2", "unit": "NTU", "type": "value", "mode": "real", "formula": "x", "min": 0, "max": 4000, "displayMax": 4000, "sim_initial": 15.4, "sim_range": 2, "sim_min": 5, "sim_max": 50 }
    ],
    "headerCaption": "Water Quality Monitoring",
    "headerSubCaption": "Real-time Data",
    "headerBackgroundColor": "#1f2937",
    "mainBackgroundColor": "#000000",
    "logo": { "type": "url", "value": "" },
    "mainBackground": { "type": "url", "value": "" },
    "headerBackground": { "type": "url", "value": "" },
    "headerCaptionFontSize": 24,
    "headerSubcaptionFontSize": 18,
    "showLogo": true,
    "showHeaderBg": true,
    "showMainBg": true,
    "contentRotation": {
        "enabled": false,
        "sequence": [
            { "type": "graph", "enabled": true, "duration": 10 },
            { "type": "video", "enabled": true, "duration": 15, "source": { "type": "url", "value": "" } },
            { "type": "image", "enabled": true, "duration": 5, "source": { "type": "url", "value": "" } }
        ]
    },
    "barChartStyling": {
        "barColor": "#8B5CF6", "rangeTextColor": "#FFFFFF", "labelTextColor": "#FFFFFF",
        "valueTextColor": "#FFFFFF", "unitTextColor": "#D1D5DB", "rangeFontSize": 18,
        "labelFontSize": 18, "valueFontSize": 18, "unitFontSize": 18
    },
    "modeStatusKey": "operation_mode",
    "operationModes": [
        { "name": "MEASURING", "value": "1" }, { "name": "CALIBRATION", "value": "2" },
        { "name": "DRAIN", "value": "3" }, { "name": "NORMAL", "value": "4" }
    ]
};
