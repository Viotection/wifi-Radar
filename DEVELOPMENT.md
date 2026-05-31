# WiFi Radar Development & Deployment Guide

## Complete Setup Instructions

### System Requirements

**Minimum:**
- Python 3.9+ (backend)
- Node.js 16+ (frontend)
- 2GB RAM
- 500MB disk space

**Recommended:**
- Python 3.11+
- Node.js 18+
- 8GB RAM
- 2GB disk space
- Modern CPU (Intel i7 or better)

**Optional (for real CSI hardware):**
- Intel 5300 WiFi NIC
- Linux kernel with CSI extraction patch
- Root/sudo access

---

## Part 1: Backend Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/Viotection/wifi-Radar.git
cd wifi-Radar
```

### Step 2: Create Python Virtual Environment

```bash
cd backend

# On macOS/Linux:
python3 -m venv venv
source venv/bin/activate

# On Windows:
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

**Dependency Breakdown:**

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.104.1 | REST API framework |
| uvicorn | 0.24.0 | ASGI server for FastAPI |
| torch | 2.1.1 | Deep learning framework |
| numpy | 1.24.3 | Numerical computing |
| scipy | 1.11.4 | Scientific computing |
| pydantic | 2.5.0 | Data validation |
| tqdm | 4.66.1 | Progress bars |

### Step 4: Verify Installation

```bash
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
python -c "import fastapi; print(f'FastAPI: {fastapi.__version__}')"
```

### Step 5: Start Backend Server

```bash
python main.py
```

**Expected Output:**
```
============================================================
WiFi Radar Backend
============================================================
FastAPI running on http://localhost:8000
WebSocket available at ws://localhost:8000/ws
API docs at http://localhost:8000/docs
============================================================

INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

✅ Backend is running!

---

## Part 2: Frontend Installation

### Step 1: Navigate to Frontend Directory

```bash
# From project root:
cd frontend
```

### Step 2: Install Node Dependencies

```bash
npm install
```

**Key Packages Installed:**

| Package | Purpose |
|---------|---------|
| react | UI framework |
| react-dom | React rendering |
| recharts | Charts & graphs |
| axios | HTTP client (optional) |

### Step 3: Start Development Server

```bash
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view wifi-radar-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Note that the development build is not optimized.
```

✅ Frontend is running!  
🌐 Open http://localhost:3000 in your browser

---

## Part 3: Testing the Full System

### Verify Both Services Running

**Terminal 1 (Backend):**
```bash
$ curl http://localhost:8000/health
{"status": "healthy", "timestamp": 1234567890}
```

**Terminal 2 (Frontend):**
```bash
Visit http://localhost:3000
```

### Explore the Dashboard

1. **Tactical Radar View:**
   - Green animated sweep
   - Watch blip move from Far → Medium → Near
   - Motion trend displayed (APPROACHING/DEPARTING)

2. **Analytics Dashboard:**
   - Zone distribution pie chart filling in real-time
   - Confidence timeline climbing
   - Occupancy metrics updating

3. **REST API Documentation:**
   - Visit http://localhost:8000/docs
   - Try `/health`, `/api/stats`, `/api/history` endpoints

---

## Training Models

### Option A: Quick Demo (Default)

The system comes with **untrained models** but works perfectly in demo mode with the CSI simulator. The models initialize randomly, so detection is probabilistic but consistent for testing.

### Option B: Train Presence Model

Recommended if you want realistic accuracy (~95%+).

```bash
cd backend
python training/train_presence.py
```

**What happens:**
1. Downloads UT-HAR dataset (4,973 CSI samples)
2. Trains CNN-5 for 30 epochs
3. Saves best weights to `backend/models/presence.pt`
4. Expected time: ~5 minutes on modern CPU

**Output:**
```
============================================================
Training Presence Detection Model (CNN-5)
============================================================
Model Parameters: 315,394
Epoch 1/30: Loss: 0.5234, Accuracy: 72.43%
Epoch 2/30: Loss: 0.3847, Accuracy: 81.92%
...
Epoch 30/30: Loss: 0.0234, Accuracy: 98.34%
✓ Model saved to backend/models/presence.pt
============================================================
Training Complete!
============================================================
```

### Option C: Train Proximity Model

For 3-class distance estimation (Near/Medium/Far).

```bash
cd backend
python training/train_proximity.py
```

**What happens:**
1. Generates synthetic proximity data with signal energy labels
2. Trains CNN-GRU for 50 epochs
3. Saves best weights to `backend/models/proximity.pt`
4. Expected time: ~10 minutes on modern CPU

**Output:**
```
============================================================
Training Proximity Estimation Model (CNN-GRU)
============================================================
Model Parameters: 52,384
Epoch 1/50: Loss: 1.0234, Accuracy: 65.21%
...
Epoch 50/50: Loss: 0.1234, Accuracy: 87.56%
✓ Model saved to backend/models/proximity.pt
============================================================
Training Complete!
============================================================
```

### Option D: Train Both Models (Full Pipeline)

```bash
cd backend
python training/train_presence.py && python training/train_proximity.py
```

Total time: ~15 minutes  
Result: Production-grade models ready for deployment

---

## Configuration & Customization

### Backend Configuration

Edit `backend/inference.py`:

```python
class InferenceEngine:
    def __init__(self, 
                 presence_model_path: Optional[str] = None,
                 proximity_model_path: Optional[str] = None,
                 window_size: int = 100,              # Adjust CSI window
                 buffer_size: int = 500,              # History size
                 presence_threshold: float = 0.55,    # Detection sensitivity
                 device: str = 'cpu'):                # or 'cuda'
        ...
```

**Tuning Parameters:**

| Parameter | Default | Effect | Range |
|-----------|---------|--------|-------|
| `presence_threshold` | 0.55 | Lower = more sensitive | 0.0–1.0 |
| `window_size` | 100 | Seconds of history | 50–200 |
| `buffer_size` | 500 | Max history frames | 100–2000 |

### Frontend Configuration

Edit `frontend/src/hooks/useCSIStream.js`:

```javascript
const WS_URL = 'ws://localhost:8000/ws';  // Change for remote backend
const maxRetries = 10;                     // Auto-reconnect attempts
```

### CSI Simulator Behavior

Edit `backend/simulator.py`:

```python
class CSISimulator:
    def __init__(self,
                 num_antennas: int = 3,
                 num_subcarriers: int = 30,
                 window_size: int = 100,
                 freq_hz: float = 5.8e9,  # 5.8 GHz (5 GHz WiFi band)
                 sample_rate: int = 100):
        ...
```

**Scenario Cycle** (editable in `next_frame()` method):
- Frames 0–50: Far zone (3.0m)
- Frames 50–150: Approach phase (3.0m → 0.5m)
- Frames 150–200: Near zone (0.5m)
- Frames 200–250: Depart phase (0.5m → 3.0m)

---

## Advanced: Real CSI Hardware Integration

### Prerequisites

- **Intel 5300 WiFi NIC** (required for real CSI data)
- **Linux OS** (kernel 3.10+ recommended)
- **Root/sudo access**
- **CSI Extraction Tool** installed

### Step 1: Install CSI Extraction Driver

```bash
# Clone the Intel 5300 CSI tool
git clone https://github.com/dhalperi/linux-80211n-csitool.git
cd linux-80211n-csitool/injection

# Follow their build instructions
make
sudo insmod mod.ko
```

### Step 2: Extract CSI Data

```bash
# Start packet logging
sudo ./log_to_file log.dat

# In another terminal, ping the target:
ping -i 0.1 192.168.1.1  # ~10 packets/sec
```

### Step 3: Parse CSI Data

Create `backend/csi_reader.py`:

```python
import struct
import numpy as np

class CSIReader:
    """Reads parsed CSI data from log file."""
    
    def __init__(self, log_file: str):
        self.log_file = log_file
        self.packets = []
        self._parse_log()
    
    def _parse_log(self):
        """Parse Intel 5300 CSI log format."""
        with open(self.log_file, 'rb') as f:
            while True:
                # Read packet structure (Intel CSI format)
                data = f.read(4)
                if not data:
                    break
                
                timestamp, = struct.unpack('<I', data)
                csi_len, = struct.unpack('<I', f.read(4))
                
                # Read CSI data
                csi_raw = f.read(csi_len)
                csi_amplitude = self._extract_amplitude(csi_raw)
                
                self.packets.append({
                    'timestamp': timestamp,
                    'amplitude': csi_amplitude,
                })
    
    def _extract_amplitude(self, csi_raw: bytes) -> np.ndarray:
        """Extract amplitude from raw CSI."""
        # Parse subcarrier data (30 subcarriers, 3 antennas)
        csi = np.zeros((3, 30), dtype=np.float32)
        
        for antenna in range(3):
            for subcarrier in range(30):
                offset = antenna * 30 * 2 + subcarrier * 2
                real = struct.unpack('<h', csi_raw[offset:offset+2])[0]
                imag = struct.unpack('<h', csi_raw[offset+2:offset+4])[0]
                csi[antenna, subcarrier] = np.sqrt(real**2 + imag**2)
        
        return csi

# Usage in backend/main.py:
# csi_reader = CSIReader('log.dat')
# csi_data = csi_reader.get_next_frame()
```

### Step 4: Replace Simulator

Edit `backend/main.py`:

```python
# OLD:
from simulator import CSISimulator
simulator = CSISimulator()
csi_data = simulator.next_frame()

# NEW:
from csi_reader import CSIReader
reader = CSIReader('/path/to/log.dat')
csi_data = reader.get_next_frame()
```

### Step 5: Test Real CSI

```bash
python main.py
# Should show real WiFi sensor data instead of simulator
```

---

## Docker Deployment

### Build Docker Image

```bash
docker build -t wifi-radar:latest .
```

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y \
    build-essential \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Backend
COPY backend/requirements.txt backend/
RUN pip install -r backend/requirements.txt

# Frontend
COPY frontend/ frontend/
WORKDIR /app/frontend
RUN npm install && npm run build

# Start both services
WORKDIR /app
COPY . .

EXPOSE 8000 3000

CMD ["sh", "-c", "python backend/main.py & npm --prefix frontend start"]
```

### Run Container

```bash
docker run -p 8000:8000 -p 3000:3000 wifi-radar:latest
```

---

## Deployment Options

### Local Testing (Development)

```bash
# Terminal 1
cd backend && python main.py

# Terminal 2
cd frontend && npm start
```

✅ Best for: Development, debugging, quick demos

### Production (Single Machine)

```bash
# Use uvicorn + gunicorn for production
pip install gunicorn

# Backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app --bind 0.0.0.0:8000

# Frontend (build first)
cd frontend && npm run build
npx serve -s build -l 3000
```

### Cloud Deployment (AWS/GCP/Heroku)

**AWS EC2:**
```bash
# 1. Create EC2 instance (t2.medium)
# 2. SSH in
# 3. Clone repo & follow backend/frontend setup
# 4. Use systemd to keep services running
```

**Heroku (with procfile):**
```
web: gunicorn -w 1 -k uvicorn.workers.UvicornWorker backend.main:app
release: cd frontend && npm run build
```

---

## Performance Tuning

### Backend Optimization

**Enable GPU (if available):**
```python
# backend/inference.py
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Using device: {device}")
```

**Reduce inference latency:**
```python
# Smaller window size
window_size = 50  # 0.5 seconds instead of 1.0

# Batch processing
batch_size = 32
```

**Increase throughput:**
```python
# backend/main.py
await asyncio.sleep(0.05)  # 20 Hz instead of 10 Hz
```

### Frontend Optimization

**Reduce update frequency:**
```javascript
// frontend/src/hooks/useCSIStream.js
// Only update DOM every 2nd message
if (frameCount % 2 === 0) {
  setData(newData);
}
```

**Lazy-load charts:**
```jsx
// frontend/src/Dashboard.jsx
import React, { Suspense } from 'react';
const ChartsComponent = React.lazy(() => import('./Charts'));
```

---

## Troubleshooting

### Backend Issues

**Issue: "Address already in use" error**
```bash
# Kill existing process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
uvicorn main:app --port 8001
```

**Issue: "ModuleNotFoundError: No module named 'torch'"**
```bash
# Reinstall PyTorch
pip uninstall torch
pip install torch==2.1.1
```

**Issue: Slow inference (>50ms)**
```bash
# Check CPU usage
top

# Reduce window size (if acceptable for accuracy)
window_size = 50  # instead of 100

# Enable GPU
device = 'cuda'
```

### Frontend Issues

**Issue: "EADDRINUSE: address already in use :::3000"**
```bash
# Kill port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm start -- --port 3001
```

**Issue: "Module not found" after npm install**
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Issue: WebSocket won't connect**
```bash
# Check backend is running
curl http://localhost:8000/health

# Check browser console (F12)
# Should see: "✓ WebSocket connected"
```

### General Issues

**Issue: "ImportError: cannot import name 'X' from models"**
```bash
# Ensure models/__init__.py exists
touch backend/models/__init__.py

# Restart backend
python main.py
```

**Issue: Models not loading**
```bash
# Check file exists
ls -la backend/models/presence.pt

# Train if missing
python backend/training/train_presence.py
```

---

## Testing

### Unit Tests (Coming Soon)

```bash
pytest backend/tests/
```

### Integration Tests

```bash
# Test API endpoints
python -m pytest backend/tests/test_api.py -v

# Test models
python -m pytest backend/tests/test_models.py -v
```

### Manual Testing

```bash
# Test presence detection
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"csi": [[[0.5, 0.4, 0.3]]]}'

# WebSocket test (requires websocat)
websocat ws://localhost:8000/ws
```

---

## Production Checklist

- [ ] Models trained and saved to `backend/models/`
- [ ] Backend running on port 8000
- [ ] Frontend built with `npm run build`
- [ ] Frontend served on port 3000 (or 80 in production)
- [ ] CORS properly configured for your domain
- [ ] Database/logging configured (if needed)
- [ ] SSL/TLS certificates installed (for HTTPS)
- [ ] Rate limiting enabled (for API)
- [ ] Monitoring/alerting set up (for uptime)
- [ ] Backups configured (for model weights)

---

## FAQ

**Q: Do I need real WiFi hardware to run this?**  
A: No! The CSI simulator works perfectly for demos and testing. Real hardware is optional for production.

**Q: How accurate are the models without training?**  
A: Models initialize randomly, so accuracy is ~50%. Train them for realistic results (>95% for presence, ~80% for proximity).

**Q: Can I use this with Raspberry Pi?**  
A: Yes! Torch is available for ARM, but inference will be slower (~50ms). Consider model quantization for edge devices.

**Q: How do I integrate with real CSI hardware?**  
A: See "Advanced: Real CSI Hardware Integration" section above.

**Q: Can I deploy this on my own server?**  
A: Yes! See "Cloud Deployment" section above.

---

## Support & Resources

- **Documentation:** README.md (overview), this file (detailed guide)
- **API Docs:** http://localhost:8000/docs (interactive Swagger UI)
- **Issues:** https://github.com/Viotection/wifi-Radar/issues
- **Community:** https://github.com/Viotection/wifi-Radar/discussions

---

**Need help? Start with the Quick Start in README.md, then reference this guide for advanced topics.** 🚀
