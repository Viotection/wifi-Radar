# WiFi Radar Development Guide

## Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/kasamu/wifi-Radar.git
cd wifi-Radar
```

### 2. Backend Setup

**Create virtual environment:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Start server:**
```bash
python main.py
```

Server runs on `http://localhost:8000`
WebSocket endpoint: `ws://localhost:8000/ws`
API docs: `http://localhost:8000/docs`

### 3. Frontend Setup

**Install dependencies:**
```bash
cd frontend
npm install
```

**Start development server:**
```bash
npm start
```

Frontend runs on `http://localhost:3000`

## Training Models

### Presence Detection
```bash
cd backend
python training/train_presence.py
```

Expected output: `backend/models/presence.pt`

### Proximity Estimation
```bash
cd backend
python training/train_proximity.py
```

Expected output: `backend/models/proximity.pt`

## Architecture Overview

### Backend Stack
- **Framework:** FastAPI
- **Models:** PyTorch
- **Real-time:** WebSocket (10 Hz update rate)
- **Inference Engine:** CPU-optimized (3-5ms per prediction)

### Frontend Stack
- **Framework:** React 18
- **Charts:** Recharts
- **Real-time:** WebSocket client with auto-reconnect

### Model Architecture

**Presence Detection (CNN-5):**
- Input: CSI amplitude (1, 30, 100)
- 5 convolutional layers with batch norm
- ~300K parameters
- Output: [Absent, Present] probabilities

**Proximity Estimation (CNN-GRU):**
- Input: CSI amplitude (3, 30, 100)
- CNN feature extractor + 2-layer GRU
- ~50K parameters
- Output: [Near, Medium, Far] probabilities

## Demo Walkthrough

1. **Terminal 1 - Backend:**
   ```bash
   cd backend
   python main.py
   ```

2. **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Open browser:** `http://localhost:3000`

4. **View live radar and analytics:**
   - Radar View: Real-time tactical display with animated blips
   - Dashboard: Zone distribution, confidence timeline, occupancy metrics

## Troubleshooting

### WebSocket Connection Failed
- Ensure backend is running on localhost:8000
- Check CORS headers in main.py
- Try refreshing frontend (Ctrl+Shift+R)

### Slow Inference
- Verify CPU not maxed out
- Check window size (100 frames = ~1 second)
- Consider reducing update frequency in main.py

### Model Training Fails
- Download UT-HAR dataset (link in train_presence.py)
- Verify PyTorch installed correctly
- Check CUDA availability (torch.cuda.is_available())

## Next Steps

1. **Integrate Real CSI Hardware:**
   - Install Intel 5300 WiFi driver with CSI extraction
   - Modify `main.py` to read from hardware instead of simulator

2. **Improve Proximity Accuracy:**
   - Collect more labeled distance data
   - Use transfer learning from presence model
   - Add signal phase features

3. **Multi-Person Tracking:**
   - Implement DBScan clustering on CSI patterns
   - Estimate person count
   - Track trajectories

4. **Sector Approximation:**
   - Use antenna array to estimate arrival angle
   - Narrow down person location within room

## References

- **SenseFi Benchmark:** Deep Sensing for Real-Time Activity Recognition
- **UT-HAR Dataset:** https://github.com/ermongroup/ut-har-data
- **Intel 5300 CSI Tool:** https://github.com/dhalperi/linux-80211n-csitool
