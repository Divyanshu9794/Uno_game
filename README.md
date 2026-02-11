
## **Option 1: Export Code via GitHub (Recommended)**

1. **Push to GitHub from Emergent:**
   - In the Emergent interface, use the GitHub integration to push your code
   - This will export your entire project structure

2. **Clone on your local machine:**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

## **Option 2: Download Code Directly**

- Use Emergent's code download feature to get a ZIP file of your project
- Extract it to your preferred location

---

## **Local Setup Steps:**

### **1. Prerequisites**
Install these on your machine:
- **Python 3.9+** (for backend)
- **Node.js 16+** and **Yarn** (for frontend)
- **MongoDB** (local installation or MongoDB Atlas cloud)

### **2. Backend Setup**

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Edit backend/.env file:
MONGO_URL=mongodb://localhost:27017  # or your MongoDB Atlas URL
DB_NAME=uno_game
CORS_ORIGINS=http://localhost:3000

# Run the backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### **3. Frontend Setup**

```bash
cd frontend

# Install dependencies
yarn install

# Configure environment variables
# Edit frontend/.env file:
REACT_APP_BACKEND_URL=http://localhost:8001

# Run the frontend
yarn start
```

### **4. Access the Game**

Open your browser and go to: **http://localhost:3000**

---

## **Quick Start (Combined)**

```bash
# Terminal 1 - Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend && yarn install && yarn start
```
