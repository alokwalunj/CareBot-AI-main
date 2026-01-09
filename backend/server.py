from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText, OpenAITextToSpeech

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Healthcare Chatbot API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    age: Optional[int] = None
    existing_conditions: Optional[List[str]] = []

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    age: Optional[int] = None
    existing_conditions: List[str] = []
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ChatMessageCreate(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    session_id: str
    role: str  # "user" or "assistant"
    content: str
    severity: Optional[str] = None  # "mild", "consultation", "emergency"
    suggestions: Optional[List[str]] = None
    timestamp: str

class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    created_at: str
    last_message_at: str

class DoctorResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    specialty: str
    experience_years: int
    rating: float
    available_slots: List[str]
    image_url: str

class AppointmentCreate(BaseModel):
    doctor_id: str
    slot: str
    symptoms: str
    notes: Optional[str] = ""

class AppointmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    doctor_id: str
    doctor_name: str
    doctor_specialty: str
    slot: str
    symptoms: str
    notes: str
    status: str  # "scheduled", "completed", "cancelled"
    created_at: str

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "age": user_data.age,
        "existing_conditions": user_data.existing_conditions or [],
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email)
    
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        age=user_data.age,
        existing_conditions=user_data.existing_conditions or [],
        created_at=now
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"])
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        age=user.get("age"),
        existing_conditions=user.get("existing_conditions", []),
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ============== CHAT ROUTES ==============

SYSTEM_PROMPT = """You are CareBot, an AI healthcare assistant. Your role is to:

1. Listen to patient symptoms with empathy and care
2. Ask clarifying questions about symptoms, duration, and severity
3. Classify the urgency:
   - MILD: Common, treatable issues (cold, minor headache, small cuts)
   - CONSULTATION: Should see a doctor but not urgent (persistent symptoms, moderate pain)
   - EMERGENCY: Needs immediate care (chest pain, severe bleeding, breathing difficulty, stroke symptoms)

4. For MILD issues, you may suggest:
   - Common OTC medications (with standard dosage guidance)
   - Home care tips (rest, hydration, etc.)
   
5. Always include this disclaimer for any medical guidance:
   "⚠️ This is not a medical diagnosis. Please consult a healthcare professional if symptoms persist or worsen."

6. For EMERGENCY cases, immediately advise:
   "🚨 EMERGENCY: Please call emergency services (911) or go to the nearest emergency room immediately."

7. Be warm, reassuring, and professional. Use simple language.

IMPORTANT RULES:
- Never prescribe prescription medications
- Never diagnose serious conditions
- Always recommend doctor consultation for unclear or serious symptoms
- Suggest booking an appointment when appropriate

Respond in a conversational, caring manner. Keep responses concise but helpful."""

async def analyze_with_ai(message: str, session_id: str, user_context: dict) -> dict:
    """Analyze symptoms using Claude AI"""
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    # Build context about user
    context_parts = []
    if user_context.get("age"):
        context_parts.append(f"Patient age: {user_context['age']}")
    if user_context.get("existing_conditions"):
        context_parts.append(f"Existing conditions: {', '.join(user_context['existing_conditions'])}")
    
    user_context_str = "\n".join(context_parts) if context_parts else "No additional patient context available."
    
    enhanced_system = f"{SYSTEM_PROMPT}\n\nPatient Context:\n{user_context_str}"
    
    # Get chat history for this session
    history = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(20)
    
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=enhanced_system
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    
    # Add history to chat context
    for msg in history:
        if msg["role"] == "user":
            chat.messages.append({"role": "user", "content": msg["content"]})
        else:
            chat.messages.append({"role": "assistant", "content": msg["content"]})
    
    user_message = UserMessage(text=message)
    response = await chat.send_message(user_message)
    
    # Determine severity from response
    severity = "mild"
    response_lower = response.lower()
    if "emergency" in response_lower or "🚨" in response or "911" in response_lower:
        severity = "emergency"
    elif "consult" in response_lower or "doctor" in response_lower or "appointment" in response_lower:
        severity = "consultation"
    
    # Extract suggestions if any
    suggestions = []
    if severity == "mild":
        if "rest" in response_lower:
            suggestions.append("Get adequate rest")
        if "hydrat" in response_lower or "water" in response_lower:
            suggestions.append("Stay hydrated")
        if "pain reliever" in response_lower or "acetaminophen" in response_lower or "ibuprofen" in response_lower:
            suggestions.append("Consider OTC pain relievers")
    
    return {
        "response": response,
        "severity": severity,
        "suggestions": suggestions
    }

@api_router.post("/chat/message", response_model=ChatMessageResponse)
async def send_chat_message(
    message_data: ChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    session_id = message_data.session_id
    now = datetime.now(timezone.utc).isoformat()
    
    # Create new session if needed
    if not session_id:
        session_id = str(uuid.uuid4())
        title = message_data.message[:50] + "..." if len(message_data.message) > 50 else message_data.message
        await db.chat_sessions.insert_one({
            "id": session_id,
            "user_id": current_user["id"],
            "title": title,
            "created_at": now,
            "last_message_at": now
        })
    
    # Save user message
    user_msg_id = str(uuid.uuid4())
    await db.chat_messages.insert_one({
        "id": user_msg_id,
        "session_id": session_id,
        "role": "user",
        "content": message_data.message,
        "severity": None,
        "suggestions": None,
        "timestamp": now
    })
    
    # Get AI response
    try:
        ai_result = await analyze_with_ai(
            message_data.message,
            session_id,
            current_user
        )
    except Exception as e:
        logging.error(f"AI Error: {e}")
        ai_result = {
            "response": "I apologize, but I'm having trouble processing your request right now. Please try again or contact support if the issue persists.",
            "severity": "consultation",
            "suggestions": ["Please try again later"]
        }
    
    # Save AI response
    ai_msg_id = str(uuid.uuid4())
    ai_timestamp = datetime.now(timezone.utc).isoformat()
    
    await db.chat_messages.insert_one({
        "id": ai_msg_id,
        "session_id": session_id,
        "role": "assistant",
        "content": ai_result["response"],
        "severity": ai_result["severity"],
        "suggestions": ai_result["suggestions"],
        "timestamp": ai_timestamp
    })
    
    # Update session last message time
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$set": {"last_message_at": ai_timestamp}}
    )
    
    return ChatMessageResponse(
        id=ai_msg_id,
        session_id=session_id,
        role="assistant",
        content=ai_result["response"],
        severity=ai_result["severity"],
        suggestions=ai_result["suggestions"],
        timestamp=ai_timestamp
    )

@api_router.get("/chat/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(current_user: dict = Depends(get_current_user)):
    sessions = await db.chat_sessions.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(50)
    return sessions

@api_router.get("/chat/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify session belongs to user
    session = await db.chat_sessions.find_one({
        "id": session_id,
        "user_id": current_user["id"]
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return messages

@api_router.delete("/chat/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    session = await db.chat_sessions.find_one({
        "id": session_id,
        "user_id": current_user["id"]
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.chat_sessions.delete_one({"id": session_id})
    await db.chat_messages.delete_many({"session_id": session_id})
    
    return {"message": "Session deleted"}

# ============== VOICE ROUTES ==============

class TTSRequest(BaseModel):
    text: str
    voice: str = "nova"  # Default: nova voice (energetic, upbeat - good for healthcare)

class TTSResponse(BaseModel):
    audio_base64: str
    text: str

class STTResponse(BaseModel):
    text: str

@api_router.post("/voice/speech-to-text", response_model=STTResponse)
async def speech_to_text(
    audio_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Convert audio to text using OpenAI Whisper"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        stt = OpenAISpeechToText(api_key=api_key)
        
        # Read audio file content
        audio_content = await audio_file.read()
        audio_io = io.BytesIO(audio_content)
        audio_io.name = audio_file.filename or "audio.webm"
        
        # Transcribe using Whisper
        response = await stt.transcribe(
            file=audio_io,
            model="whisper-1",
            response_format="json",
            language="en"
        )
        
        return STTResponse(text=response.text)
    except Exception as e:
        logging.error(f"Speech-to-text error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@api_router.post("/voice/text-to-speech", response_model=TTSResponse)
async def text_to_speech(
    request: TTSRequest,
    current_user: dict = Depends(get_current_user)
):
    """Convert text to speech using OpenAI TTS"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        tts = OpenAITextToSpeech(api_key=api_key)
        
        # Generate audio using OpenAI TTS
        audio_base64 = await tts.generate_speech_base64(
            text=request.text,
            model="tts-1",
            voice=request.voice,
            response_format="mp3"
        )
        
        return TTSResponse(
            audio_base64=audio_base64,
            text=request.text
        )
    except Exception as e:
        logging.error(f"Text-to-speech error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")

@api_router.get("/voice/voices")
async def get_available_voices(current_user: dict = Depends(get_current_user)):
    """Get list of available OpenAI TTS voices"""
    # OpenAI TTS has 9 available voices
    return {
        "voices": [
            {"voice_id": "nova", "name": "Nova", "description": "Energetic, upbeat - great for healthcare guidance"},
            {"voice_id": "alloy", "name": "Alloy", "description": "Neutral, balanced tone"},
            {"voice_id": "echo", "name": "Echo", "description": "Smooth, calm - soothing for patients"},
            {"voice_id": "fable", "name": "Fable", "description": "Expressive, storytelling style"},
            {"voice_id": "onyx", "name": "Onyx", "description": "Deep, authoritative"},
            {"voice_id": "shimmer", "name": "Shimmer", "description": "Bright, cheerful"},
            {"voice_id": "ash", "name": "Ash", "description": "Clear, articulate"},
            {"voice_id": "coral", "name": "Coral", "description": "Warm, friendly"},
            {"voice_id": "sage", "name": "Sage", "description": "Wise, measured - professional tone"}
        ]
    }

# ============== DOCTORS ROUTES ==============

# Mock doctor data
MOCK_DOCTORS = [
    {
        "id": "doc-1",
        "name": "Dr. Sarah Chen",
        "specialty": "General Practitioner",
        "experience_years": 12,
        "rating": 4.9,
        "available_slots": ["Tomorrow 9:00 AM", "Tomorrow 2:00 PM", "Friday 10:00 AM", "Friday 3:00 PM"],
        "image_url": "https://images.pexels.com/photos/5215017/pexels-photo-5215017.jpeg?auto=compress&cs=tinysrgb&w=400"
    },
    {
        "id": "doc-2",
        "name": "Dr. Michael Roberts",
        "specialty": "Internal Medicine",
        "experience_years": 15,
        "rating": 4.8,
        "available_slots": ["Today 4:00 PM", "Tomorrow 11:00 AM", "Thursday 9:00 AM"],
        "image_url": "https://images.pexels.com/photos/5327580/pexels-photo-5327580.jpeg?auto=compress&cs=tinysrgb&w=400"
    },
    {
        "id": "doc-3",
        "name": "Dr. Emily Watson",
        "specialty": "Family Medicine",
        "experience_years": 8,
        "rating": 4.7,
        "available_slots": ["Tomorrow 8:00 AM", "Tomorrow 1:00 PM", "Friday 11:00 AM", "Friday 4:00 PM"],
        "image_url": "https://images.pexels.com/photos/8376277/pexels-photo-8376277.jpeg?auto=compress&cs=tinysrgb&w=400"
    },
    {
        "id": "doc-4",
        "name": "Dr. James Liu",
        "specialty": "Emergency Medicine",
        "experience_years": 20,
        "rating": 4.9,
        "available_slots": ["Today 6:00 PM", "Tomorrow 7:00 AM", "Saturday 9:00 AM"],
        "image_url": "https://images.pexels.com/photos/5327656/pexels-photo-5327656.jpeg?auto=compress&cs=tinysrgb&w=400"
    }
]

@api_router.get("/doctors", response_model=List[DoctorResponse])
async def get_doctors(current_user: dict = Depends(get_current_user)):
    return MOCK_DOCTORS

@api_router.get("/doctors/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(doctor_id: str, current_user: dict = Depends(get_current_user)):
    for doc in MOCK_DOCTORS:
        if doc["id"] == doctor_id:
            return doc
    raise HTTPException(status_code=404, detail="Doctor not found")

# ============== APPOINTMENTS ROUTES ==============

@api_router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: dict = Depends(get_current_user)
):
    # Find doctor
    doctor = None
    for doc in MOCK_DOCTORS:
        if doc["id"] == appointment_data.doctor_id:
            doctor = doc
            break
    
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    if appointment_data.slot not in doctor["available_slots"]:
        raise HTTPException(status_code=400, detail="Selected slot is not available")
    
    appointment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    appointment_doc = {
        "id": appointment_id,
        "user_id": current_user["id"],
        "doctor_id": doctor["id"],
        "doctor_name": doctor["name"],
        "doctor_specialty": doctor["specialty"],
        "slot": appointment_data.slot,
        "symptoms": appointment_data.symptoms,
        "notes": appointment_data.notes or "",
        "status": "scheduled",
        "created_at": now
    }
    
    await db.appointments.insert_one(appointment_doc)
    
    return AppointmentResponse(**appointment_doc)

@api_router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(current_user: dict = Depends(get_current_user)):
    appointments = await db.appointments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return appointments

@api_router.patch("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = await db.appointments.update_one(
        {"id": appointment_id, "user_id": current_user["id"]},
        {"$set": {"status": "cancelled"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"message": "Appointment cancelled"}

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Healthcare Chatbot API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
