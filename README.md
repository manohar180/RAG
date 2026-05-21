DocuMind — RAG-Powered Document Chat
Upload any PDF or text file and have a conversation with it. Answers are grounded strictly in your document — not from the model's memory.
Live Demo

App: [your-app.vercel.app](https://rag-mu-one.vercel.app/)


How it works
Upload phase
You upload a PDF or TXT file. The backend extracts the text, splits it into 500-word chunks with 50-word overlap (sliding window), converts each chunk into a vector embedding, and stores everything in Qdrant.
Chat phase
Your question is embedded using the same model. Qdrant finds the 5 most semantically similar chunks. Those chunks are passed to Groq's LLM as context, and the model is instructed to answer only from that context — nothing else. The response streams back in real time.
PDF / TXT → Extract → Chunk → Embed → Qdrant
Question  → Embed → Similarity Search → Top 5 Chunks → Groq → Streamed Answer

Tech Stack
LayerTechnologyFrontendReact 18 + ViteBackendNode.js + ExpressEmbeddingsNomic Embed API (nomic-embed-text-v1.5)Vector DatabaseQdrant CloudLLMGroq — llama-3.3-70b-versatileStreamingServer-Sent Events (SSE)

Features

Drag and drop file upload with progress indicator
Real-time streaming responses token by token
Source citations showing exactly which page each answer came from
Multi-turn conversation with history
Refuses to answer from outside the document


Local Setup
bash# 1. Clone
git clone https://github.com/manohar180/notebooklm-rag.git
cd notebooklm-rag

# 2. Backend
cd backend
cp .env.example .env    # add your API keys
npm install
npm run dev

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
Open http://localhost:5173
You'll need free API keys from Groq, Qdrant Cloud, and Nomic.

Deployment
Backend is deployed on Render (root directory: backend, start command: npm start).
Frontend is deployed on Vercel (root directory: frontend, framework: Vite).
